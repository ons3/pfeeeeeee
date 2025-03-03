"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth2_1 = require("passport-google-oauth2");
// Fill in your Google OAuth2 credentials
const GOOGLE_CLIENT_ID = 'your-google-client-id';
const GOOGLE_CLIENT_SECRET = 'your-google-client-secret';
passport_1.default.use(new passport_google_oauth2_1.Strategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/google/callback",
    passReqToCallback: true
}, (request, accessToken, refreshToken, profile, done) => {
    // Allow only the specific email to log in
    if (profile.email === 'onsbenamara170@gmail.com') {
        return done(null, profile);
    }
    else {
        return done(null, false, { message: 'You are not authorized to access this application.' });
    }
}));
// Serialize user for session management
passport_1.default.serializeUser((user, done) => {
    done(null, user);
});
// Deserialize user for session management
passport_1.default.deserializeUser((user, done) => {
    done(null, user);
});
