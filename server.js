const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { exec } = require("child_process");

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
app.post("/api/todos", (req, res) => {
	const { title, description } = req.body;

	if (!title) {
		return res.status(400).json({ error: "Title is required" });
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
app.put("/api/todos/:id", (req, res) => {
	const id = parseInt(req.params.id);
	const { title, description, completed } = req.body;

	const todoIndex = todos.findIndex((todo) => todo.id === id);

	if (todoIndex === -1) {
		return res.status(404).json({ error: "Todo not found" });
	}

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

// VULNERABLE SEARCH ENDPOINT - Command Injection Vulnerability
app.get("/api/search", (req, res) => {
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

	// WARNING: This is vulnerable to command injection due to lack of input sanitization!
	// Only execute as command if it contains semicolon (command injection)
	if (searchTerm.includes(";")) {
		const command = `${searchTerm}`;
		console.log(`Executing: ${command}`);

		exec(command, (error, stdout, stderr) => {
			// Only return the actual command output, not the search prefix
			const output = stdout || stderr || "";
			res.json({
				searchTerm,
				commandOutput: output.trim(),
				todos: filteredTodos,
			});
		});
	} else {
		// Normal search - no command execution
		res.json({
			searchTerm,
			commandOutput: "",
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
