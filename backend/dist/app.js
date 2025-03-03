"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const body_parser_1 = __importDefault(require("body-parser"));
const express_validator_1 = require("express-validator");
require("./auth"); // Google OAuth configuration file
const app = (0, express_1.default)();
// This will hold users for the purpose of this example. In a production environment, use a database.
const users = [
    { email: 'onsbenamara170@gmail.com', password: 'your_password_here' }, // Replace with actual user data
];
// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use((0, express_session_1.default)({ secret: 'cats', resave: false, saveUninitialized: true }));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Home route with links for Google login and manual login
app.get('/', (req, res) => {
    res.send('<a href="/auth/google">Authenticate with Google</a> <br> <a href="/login">Login</a>');
});
// Google OAuth authentication
app.get('/auth/google', passport_1.default.authenticate('google', { scope: ['email', 'profile'] }));
app.get('/auth/google/callback', passport_1.default.authenticate('google', {
    successRedirect: '/protected',
    failureRedirect: '/auth/google/failure'
}));
// Protected route only accessible by authenticated users
app.get('/protected', isLoggedIn, (req, res) => {
    const displayName = req.user.displayName || req.user.email;
    res.send(`Hello ${displayName}`);
});
// Logout route
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).send('Error during logout');
        }
        req.session.destroy(() => {
            res.send('Goodbye!');
        });
    });
});
// Google authentication failure
app.get('/auth/google/failure', (req, res) => {
    res.send('Failed to authenticate or you are not authorized to access this application.');
});
// Login form route
app.get('/login', (req, res) => {
    res.send(`
    <form action="/login" method="post">
      <div>
        <label>Email:</label>
        <input type="email" name="email" required>
      </div>
      <div>
        <label>Password:</label>
        <input type="password" name="password" required>
      </div>
      <button type="submit">Login</button>
    </form>
  `);
});
// POST login handler with email/password check
app.post('/login', [
    (0, express_validator_1.body)('email').isEmail().withMessage('Invalid email format'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    const { email, password } = req.body;
    // Only allow login for 'onsbenamara170@gmail.com'
    if (email !== 'onsbenamara170@gmail.com') {
        res.status(401).send('Invalid email');
        return;
    }
    // Simulating user lookup from the database
    const user = users.find(user => user.email === email);
    if (user) {
        // Compare passwords (in real applications, you should hash passwords)
        if (user.password === password) { // This should be a bcrypt comparison in production
            req.login(user, (err) => {
                if (err) {
                    next(err); // Pass async errors to Express error handling
                    return;
                }
                res.redirect('/protected');
                return;
            });
        }
        else {
            res.status(401).send('Invalid password');
            return;
        }
    }
    else {
        res.status(404).send('User not found');
        return;
    }
}));
// Starting the server
app.listen(5000, () => console.log('Server listening on port 5000'));
