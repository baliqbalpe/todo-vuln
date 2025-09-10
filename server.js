const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { exec } = require("child_process");
const axios = require("axios");
const fs = require("fs").promises;

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// In-memory storage for todos (in a real app, you'd use a database)
let todos = [
	{
		id: 1,
		title: "Learn Express.js",
		description: "Build a basic web server",
		completed: false,
	},
	{
		id: 2,
		title: "Study security vulnerabilities",
		description: "Understand command injection",
		completed: false,
	},
	{
		id: 3,
		title: "Practice safe coding",
		description: "Always validate user input",
		completed: true,
	},
];
let nextId = 4;

// Routes

// Serve the main HTML page
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Get all todos
app.get("/api/todos", (req, res) => {
	res.json(todos);
});

// Add a new todo
app.post("/api/todos", async (req, res) => {
	let { title, description } = req.body;

	if (!title) {
		return res.status(400).json({ error: "Title is required" });
	}

	// SSRF Vulnerability: Check if title or description contain URLs
	const urlPattern = /^(https?:\/\/|file:\/\/).+/i;
	const titleIsUrl = urlPattern.test(title.trim());
	const descriptionIsUrl = description && urlPattern.test(description.trim());

	if (titleIsUrl || descriptionIsUrl) {
		const fetchUrl = titleIsUrl ? title.trim() : description.trim();

		try {
			// Handle both HTTP and file protocols
			if (fetchUrl.startsWith("file://")) {
				const filePath = fetchUrl.replace(/^file:\/\//, "");
				const fileContent = await fs.readFile(filePath, "utf8");

				if (titleIsUrl) {
					title = fileContent.substring(0, 100); // Use file content as title
					description = fileContent.substring(0, 1000); // Full content in description
				} else {
					description = fileContent.substring(0, 1000);
				}
			} else if (
				fetchUrl.startsWith("http://") ||
				fetchUrl.startsWith("https://")
			) {
				const response = await axios.get(fetchUrl, {
					timeout: 5000,
					maxRedirects: 3,
					validateStatus: function (status) {
						return status < 500;
					},
				});

				let content =
					typeof response.data === "string"
						? response.data
						: JSON.stringify(response.data);

				if (titleIsUrl) {
					title = `HTTP ${response.status}`;
					description = content.substring(0, 1000);
				} else {
					description = content.substring(0, 1000);
				}
			}
		} catch (error) {
			// On error, use error message
			if (titleIsUrl) {
				title = "Error";
				description = `Failed to fetch: ${error.message}`;
			} else {
				description = `Failed to fetch: ${error.message}`;
			}
		}
	}

	const todo = {
		id: nextId++,
		title,
		description: description || "",
		completed: false,
	};

	todos.push(todo);
	res.status(201).json(todo);
});

// Update a todo
app.put("/api/todos/:id", async (req, res) => {
	const id = parseInt(req.params.id);
	let { title, description, completed } = req.body;

	const todoIndex = todos.findIndex((todo) => todo.id === id);

	if (todoIndex === -1) {
		return res.status(404).json({ error: "Todo not found" });
	}

	// SSRF Vulnerability: Check if title or description contain URLs
	const urlPattern = /^(https?:\/\/|file:\/\/).+/i;
	const titleIsUrl = title && urlPattern.test(title.trim());
	const descriptionIsUrl = description && urlPattern.test(description.trim());

	if (titleIsUrl || descriptionIsUrl) {
		const fetchUrl = titleIsUrl ? title.trim() : description.trim();

		try {
			// Handle both HTTP and file protocols
			if (fetchUrl.startsWith("file://")) {
				const filePath = fetchUrl.replace(/^file:\/\//, "");
				const fileContent = await fs.readFile(filePath, "utf8");

				if (titleIsUrl) {
					title = fileContent.substring(0, 100);
					description = fileContent.substring(0, 1000);
				} else {
					description = fileContent.substring(0, 1000);
				}
			} else if (
				fetchUrl.startsWith("http://") ||
				fetchUrl.startsWith("https://")
			) {
				const response = await axios.get(fetchUrl, {
					timeout: 5000,
					maxRedirects: 3,
					validateStatus: function (status) {
						return status < 500;
					},
				});

				let content =
					typeof response.data === "string"
						? response.data
						: JSON.stringify(response.data);

				if (titleIsUrl) {
					title = `HTTP ${response.status}`;
					description = content;
				} else {
					description = content;
				}
			}
		} catch (error) {
			// On error, use error message
			if (titleIsUrl) {
				title = "Error";
				description = `Failed to fetch: ${error.message}`;
			} else {
				description = `Failed to fetch: ${error.message}`;
			}
		}
	}

	// Update todo
	if (title !== undefined) todos[todoIndex].title = title;
	if (description !== undefined) todos[todoIndex].description = description;
	if (completed !== undefined) todos[todoIndex].completed = completed;

	res.json(todos[todoIndex]);
});

// Delete a todo
app.delete("/api/todos/:id", (req, res) => {
	const id = parseInt(req.params.id);
	const todoIndex = todos.findIndex((todo) => todo.id === id);

	if (todoIndex === -1) {
		return res.status(404).json({ error: "Todo not found" });
	}

	todos.splice(todoIndex, 1);
	res.status(204).send();
});

// VULNERABLE SEARCH ENDPOINT - Command Injection & SSRF Vulnerabilities
app.get("/api/search", async (req, res) => {
	const searchTerm = req.query.q;

	if (!searchTerm) {
		return res.status(400).json({ error: "Search term is required" });
	}

	// Filter todos based on search term (basic functionality)
	const filteredTodos = todos.filter(
		(todo) =>
			todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			todo.description.toLowerCase().includes(searchTerm.toLowerCase())
	);

	// WARNING: SSRF Vulnerability - Check if search term looks like a URL
	const httpUrlPattern = /^https?:\/\/.+/i;
	const fileUrlPattern = /^file:\/\/.+/i;
	const isHttpUrl = httpUrlPattern.test(searchTerm.trim());
	const isFileUrl = fileUrlPattern.test(searchTerm.trim());

	if (isFileUrl) {
		// EXTREMELY DANGEROUS: File URL SSRF vulnerability - allows reading local files
		try {
			const url = searchTerm.trim();
			// Extract file path from file:// URL
			const filePath = url.replace(/^file:\/\//, "");

			// Read the file content
			const fileContent = await fs.readFile(filePath, "utf8");

			return res.json({
				searchTerm,
				searchResult: fileContent.substring(0, 1000), // First 1000 chars
				todos: filteredTodos,
			});
		} catch (error) {
			return res.json({
				searchTerm,
				searchResult: `Error: ${error.message}`,
				todos: filteredTodos,
			});
		}
	} else if (isHttpUrl) {
		// SSRF vulnerability - fetch the URL without validation
		try {
			const response = await axios.get(searchTerm.trim(), {
				timeout: 5000,
				maxRedirects: 3,
				validateStatus: function (status) {
					return status < 500;
				},
			});

			let content =
				typeof response.data === "string"
					? response.data
					: JSON.stringify(response.data);
			return res.json({
				searchTerm,
				searchResult: content.substring(0, 1000), // First 1000 chars
				todos: filteredTodos,
			});
		} catch (error) {
			return res.json({
				searchTerm,
				searchResult: `Error: ${error.message}`,
				todos: filteredTodos,
			});
		}
	}

	// WARNING: Command Injection Vulnerability - Check for command injection patterns
	const commandInjectionPatterns = [
		";", // Command separator
		"&&", // AND operator
		"||", // OR operator
		"|", // Pipe
		"&", // Background execution
		"$(", // Command substitution
		"`", // Backtick command substitution
		">", // Output redirection
		"<", // Input redirection
		"\n", // Newline
		"\r", // Carriage return
	];

	const hasCommandInjection = commandInjectionPatterns.some((pattern) =>
		searchTerm.includes(pattern)
	);

	if (hasCommandInjection) {
		const command = `${searchTerm}`;

		exec(command, (error, stdout, stderr) => {
			// Return command output along with any errors
			const output = stdout || stderr || (error ? error.message : "");
			res.json({
				searchTerm,
				searchResult: output.trim(),
				todos: filteredTodos,
			});
		});
	} else {
		// Normal search - no command execution or SSRF
		res.json({
			searchTerm,
			searchResult: null,
			todos: filteredTodos,
		});
	}
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ error: "Something went wrong!" });
});

// Start the server
app.listen(PORT, () => {
	console.log(`TaskManager Pro server running on http://localhost:${PORT}`);
	console.log("Application started successfully");
});
