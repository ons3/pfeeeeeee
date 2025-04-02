import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Send an email to an employee with their credentials.
 * @param email - Employee's email address
 * @param password - Generated password
 * @returns A Promise resolving when the email is sent
 */
export const sendEmail = async (email: string, password: string): Promise<void> => {
    const loginUrl = "https://yourwebsite.com/login"; // Replace with actual login URL

    const mailOptions = {
        from: `"Your Company" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Welcome to the Company! Your Login Credentials",
        html: `
            <h2>Welcome to Our System!</h2>
            <p>Your login details:</p>
            <ul>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Password:</strong> ${password}</li>
            </ul>
            <p>Please change your password after logging in.</p>
            <a href="${loginUrl}" 
               style="display:inline-block;padding:10px 20px;color:#fff;background-color:#007bff;text-decoration:none;border-radius:5px;">
               Login Now
            </a>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(` Email sent successfully to ${email}`);
    } catch (error) {
        console.error(" Error sending email:", error);
        throw new Error("Failed to send email");
    }
};