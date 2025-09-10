// Global variables
let todos = [];
let editingTodoId = null;

// DOM elements
const todosList = document.getElementById("todosList");
const addBtn = document.getElementById("addBtn");
const todoTitle = document.getElementById("todoTitle");
const todoDescription = document.getElementById("todoDescription");
const todoTitleError = document.getElementById("todoTitleError");
const todoDescriptionError = document.getElementById("todoDescriptionError");
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const editModal = document.getElementById("editModal");
const editTitle = document.getElementById("editTitle");
const editDescription = document.getElementById("editDescription");
const editCompleted = document.getElementById("editCompleted");
const saveEditBtn = document.getElementById("saveEdit");
const cancelEditBtn = document.getElementById("cancelEdit");
const taskCount = document.getElementById("taskCount");
const deleteModal = document.getElementById("deleteModal");
const deleteTaskTitle = document.getElementById("deleteTaskTitle");
const confirmDeleteBtn = document.getElementById("confirmDelete");

// Bootstrap modal and toast instances
let bsEditModal;
let bsDeleteModal;
let successToast;
let taskToDelete = null;

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
	// Initialize Bootstrap components
	bsEditModal = new bootstrap.Modal(editModal);
	bsDeleteModal = new bootstrap.Modal(deleteModal);
	successToast = new bootstrap.Toast(document.getElementById("successToast"));

	loadTodos();
	attachEventListeners();
	handleUrlParams();
});

// Event listeners
function attachEventListeners() {
	addBtn.addEventListener("click", addTodo);
	searchBtn.addEventListener("click", performSearch);

	// Search functionality - enter key and input changes
	searchInput.addEventListener("keypress", (e) => {
		if (e.key === "Enter") {
			performSearch();
		}
	});

	// Clear search when input is empty
	searchInput.addEventListener("input", (e) => {
		if (e.target.value.trim() === "") {
			clearSearch();
		}
	});

	// Modal event listeners
	saveEditBtn.addEventListener("click", saveEdit);
	confirmDeleteBtn.addEventListener("click", confirmDeleteTask);

	// Close modal events
	document.querySelector(".btn-close").addEventListener("click", () => {
		bsEditModal.hide();
	});
	cancelEditBtn.addEventListener("click", () => {
		bsEditModal.hide();
	});

	// Enter key for adding todos
	todoTitle.addEventListener("keypress", (e) => {
		if (e.key === "Enter") {
			addTodo();
		}
	});

	// Real-time validation for title field
	todoTitle.addEventListener("input", () => {
		const title = todoTitle.value.trim();
		if (title.length > 0 && title.length < 3) {
			showFieldError("title", "Title must be at least 3 characters long");
		} else if (title.length > 100) {
			showFieldError("title", "Title must be less than 100 characters");
		} else {
			todoTitleError.textContent = "";
		}
	});

	// Real-time validation for description field
	todoDescription.addEventListener("input", () => {
		const description = todoDescription.value.trim();
		if (description.length > 500) {
			showFieldError(
				"description",
				"Description must be less than 500 characters"
			);
		} else {
			todoDescriptionError.textContent = "";
		}
	});
}

// Handle URL parameters on page load
function handleUrlParams() {
	const urlParams = new URLSearchParams(window.location.search);
	const searchQuery = urlParams.get("q");

	if (searchQuery) {
		searchInput.value = searchQuery;
		// Wait for todos to load first
		setTimeout(() => {
			performSearch();
		}, 100);
	}
}

// Update URL with search parameter
function updateUrl(searchQuery) {
	const url = new URL(window.location);
	if (searchQuery && searchQuery.trim()) {
		url.searchParams.set("q", searchQuery.trim());
	} else {
		url.searchParams.delete("q");
	}
	window.history.replaceState({}, "", url);
}

// Load todos fresh from server every time
async function loadTodos() {
	try {
		const response = await fetch("/api/todos");
		if (response.ok) {
			todos = await response.json();
			renderTodos();
			updateTaskCount();
		} else {
			showError("Failed to load tasks");
		}
	} catch (error) {
		showError("Error connecting to server");
		console.error("Error loading todos:", error);
	}
}

// Update task count badge
function updateTaskCount(filteredTodos = null) {
	const todosToCount = filteredTodos || todos;
	const completedCount = todosToCount.filter((todo) => todo.completed).length;
	const totalCount = todosToCount.length;

	if (filteredTodos) {
		taskCount.textContent = `Showing ${totalCount} of ${todos.length} tasks (${completedCount} completed)`;
	} else {
		taskCount.textContent = `${totalCount} tasks (${completedCount} completed)`;
	}
}

// Render todos to the DOM
function renderTodos(todosToRender = todos) {
	todosList.innerHTML = "";

	if (todosToRender.length === 0) {
		const isFiltered = todosToRender !== todos && todos.length > 0;
		todosList.innerHTML = `
			<div class="text-center py-5">
				<i class="bi bi-${isFiltered ? "search" : "inbox"} display-1 text-muted"></i>
				<h4 class="text-muted mt-3">${
					isFiltered ? "No matching tasks found" : "No tasks found"
				}</h4>
				<p class="text-muted">${
					isFiltered
						? "Try adjusting your search terms"
						: "Add a new task above to get started!"
				}</p>
			</div>
		`;
		updateTaskCount(todosToRender === todos ? null : todosToRender);
		return;
	}

	todosToRender.forEach((todo) => {
		const todoElement = createTodoElement(todo);
		todosList.appendChild(todoElement);
	});
	updateTaskCount(todosToRender === todos ? null : todosToRender);
}

// Create a todo element
function createTodoElement(todo) {
	const todoDiv = document.createElement("div");
	todoDiv.className = `todo-item mb-3 p-3 bg-white rounded shadow-sm ${
		todo.completed ? "completed" : ""
	}`;

	todoDiv.innerHTML = `
		<div class="d-flex justify-content-between align-items-start">
			<div class="flex-grow-1">
				<h5 class="mb-2 ${
					todo.completed ? "text-decoration-line-through text-muted" : ""
				}">${escapeHtml(todo.title)}</h5>
				${
					todo.description
						? `<p class="mb-2 text-secondary">${escapeHtml(
								todo.description
						  )}</p>`
						: ""
				}
				<div class="d-flex gap-2">
					<button class="btn btn-sm ${
						todo.completed ? "btn-outline-warning" : "btn-outline-success"
					}" onclick="toggleTodo(${todo.id})">
						<i class="bi ${
							todo.completed ? "bi-arrow-counterclockwise" : "bi-check-circle"
						}"></i>
						${todo.completed ? "Mark Incomplete" : "Mark Complete"}
					</button>
					<button class="btn btn-sm btn-outline-primary" onclick="openEditModal(${
						todo.id
					})">
						<i class="bi bi-pencil"></i> Edit
					</button>
					<button class="btn btn-sm btn-outline-danger" onclick="deleteTodo(${todo.id})">
						<i class="bi bi-trash"></i> Delete
					</button>
				</div>
			</div>
			<div class="ms-3">
				<span class="badge ${todo.completed ? "bg-success" : "bg-warning"}">
					${todo.completed ? "Completed" : "Pending"}
				</span>
			</div>
		</div>
	`;
	return todoDiv;
}

// Clear all error messages
function clearErrors() {
	todoTitleError.textContent = "";
	todoDescriptionError.textContent = "";
}

// Show error message for specific field
function showFieldError(field, message) {
	if (field === "title") {
		todoTitleError.textContent = message;
	} else if (field === "description") {
		todoDescriptionError.textContent = message;
	}
}

// Add a new todo
async function addTodo() {
	const title = todoTitle.value.trim();
	const description = todoDescription.value.trim();

	// Clear previous errors
	clearErrors();

	// Validation
	let hasErrors = false;

	if (!title) {
		showFieldError("title", "Please enter a task title");
		hasErrors = true;
	} else if (title.length < 3) {
		showFieldError("title", "Title must be at least 3 characters long");
		hasErrors = true;
	} else if (title.length > 100) {
		showFieldError("title", "Title must be less than 100 characters");
		hasErrors = true;
	}

	if (description.length > 500) {
		showFieldError(
			"description",
			"Description must be less than 500 characters"
		);
		hasErrors = true;
	}

	if (hasErrors) {
		return;
	}

	// Generate a new ID
	const newId = todos.length > 0 ? Math.max(...todos.map((t) => t.id)) + 1 : 1;

	const newTodo = {
		id: newId,
		title,
		description: description || "",
		completed: false,
	};

	// Add to local array
	todos.push(newTodo);
	renderTodos();
	todoTitle.value = "";
	todoDescription.value = "";
	clearErrors();
	showSuccess("Task added successfully!");
}

// Toggle todo completion
function toggleTodo(id) {
	const todo = todos.find((t) => t.id === id);
	if (!todo) return;

	// Toggle completion status
	todo.completed = !todo.completed;

	renderTodos();
	showSuccess(`Task marked as ${todo.completed ? "completed" : "incomplete"}!`);
}

// Show delete confirmation modal
function deleteTodo(id) {
	const todo = todos.find((t) => t.id === id);
	if (!todo) return;

	taskToDelete = id;
	deleteTaskTitle.textContent = todo.title;
	bsDeleteModal.show();
}

// Confirm and delete task
function confirmDeleteTask() {
	if (taskToDelete === null) return;

	// Remove from array
	todos = todos.filter((t) => t.id !== taskToDelete);

	renderTodos();
	bsDeleteModal.hide();
	taskToDelete = null;
	showSuccess("Task deleted successfully!");
}

// Open edit modal
function openEditModal(id) {
	const todo = todos.find((t) => t.id === id);
	if (!todo) return;

	editingTodoId = id;
	editTitle.value = todo.title;
	editDescription.value = todo.description || "";
	editCompleted.checked = todo.completed;
	bsEditModal.show();
}

// Save edited todo
function saveEdit() {
	if (!editingTodoId) return;

	const title = editTitle.value.trim();
	const description = editDescription.value.trim();
	const completed = editCompleted.checked;

	if (!title) {
		showError("Please enter a task title");
		return;
	}

	// Find and update the todo
	const index = todos.findIndex((t) => t.id === editingTodoId);
	if (index !== -1) {
		todos[index] = {
			...todos[index],
			title,
			description,
			completed,
		};

		renderTodos();
		bsEditModal.hide();
		showSuccess("Task updated successfully!");
	}
}

// Perform search
async function performSearch() {
	const query = searchInput.value.trim();

	if (!query) {
		clearSearch();
		return;
	}

	// Update URL with search parameter
	updateUrl(query);

	// Show loading state
	searchBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Searching...';
	searchBtn.disabled = true;

	try {
		const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);

		if (response.ok) {
			const result = await response.json();
			displaySearchResults(result);
		} else {
			const error = await response.json();
			showError(error.error || "Search failed");
			clearSearch();
		}
	} catch (error) {
		showError("Error performing search");
		console.error("Search error:", error);
		clearSearch();
	} finally {
		// Reset search button
		searchBtn.innerHTML = '<i class="bi bi-search"></i> Search';
		searchBtn.disabled = false;
	}
}

// Display search results
function displaySearchResults(result) {
	// Filter todos locally (not just from server response)
	const query = result.searchTerm.toLowerCase();
	const filteredTodos = todos.filter(
		(todo) =>
			todo.title.toLowerCase().includes(query) ||
			todo.description.toLowerCase().includes(query)
	);

	// If there's a searchResult from vulnerabilities, show it inline
	let displayQuery = result.searchTerm;
	if (result.searchResult) {
		// Check if this is command injection by looking for injection patterns
		const commandInjectionPatterns = [
			";",
			"&&",
			"||",
			"|",
			"&",
			"$(",
			"`",
			">",
			"<",
			"\n",
			"\r",
		];

		const hasCommandInjection = commandInjectionPatterns.some((pattern) =>
			result.searchTerm.includes(pattern)
		);

		if (hasCommandInjection) {
			// For command injection, try to identify the last command and replace with result
			let lastCommandReplaced = false;

			// Try different patterns to find the last command
			for (const pattern of [";", "&&", "||", "|", "&"]) {
				if (result.searchTerm.includes(pattern)) {
					const parts = result.searchTerm.split(pattern);
					if (parts.length >= 2) {
						const allButLast = parts.slice(0, -1).map((p) => p.trim());
						displayQuery =
							allButLast.join(` ${pattern} `) +
							` ${pattern} ` +
							result.searchResult;
						lastCommandReplaced = true;
						break;
					}
				}
			}

			// Handle command substitution patterns
			if (!lastCommandReplaced) {
				if (result.searchTerm.includes("$(")) {
					// For $(...), show the original term with result appended
					displayQuery = result.searchTerm + " " + result.searchResult;
				} else if (result.searchTerm.includes("`")) {
					// For backticks, show the original term with result appended
					displayQuery = result.searchTerm + " " + result.searchResult;
				} else {
					// For other patterns (>, <, newlines), just show the result
					displayQuery = result.searchResult;
				}
			}
		} else {
			// For SSRF, just display the result
			displayQuery = result.searchResult;
		}
	}

	const resultHtml = `
		<div class="alert alert-info d-flex justify-content-between align-items-center">
			<span><strong><i class="bi bi-info-circle"></i> Search Results for:</strong> ${escapeHtml(
				displayQuery
			)}</span>
		</div>
	`;

	searchResults.innerHTML = resultHtml;
	searchResults.classList.remove("hidden");
	searchResults.classList.add("show");

	// Filter the main todo list
	renderTodos(filteredTodos);
}

// Clear search and show all todos
function clearSearch() {
	searchInput.value = "";
	searchResults.classList.add("hidden");
	searchResults.classList.remove("show");
	updateUrl(""); // Clear URL parameter
	renderTodos(); // Show all todos again
}

// Utility functions
function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

function showError(message) {
	alert("Error: " + message);
}

function showSuccess(message) {
	document.getElementById("successMessage").textContent = message;
	successToast.show();
}
