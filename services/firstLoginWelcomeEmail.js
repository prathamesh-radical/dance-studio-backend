import db from "../db/db.js";

const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;",
    })[character]);
}

async function resetEmailClaim(userId) {
    try {
        await db.promise().query(
            "UPDATE registration SET first_login_email_status = 'pending' WHERE id = ? AND first_login_email_status = 'sending'",
            [userId]
        );
    } catch (error) {
        console.log("Could not reset first-login email status:", error);
    }
}

export async function sendFirstLoginWelcomeEmail(user) {
    const apiKey = process.env.BREVO_API_KEY?.trim() || process.env.API_KEY?.trim();
    const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();

    if (!apiKey || !senderEmail) {
        console.error(
            "First-login email is not configured. Set BREVO_API_KEY (or API_KEY) and BREVO_SENDER_EMAIL."
        );
        return;
    }

    let claimResult;
    try {
        [claimResult] = await db.promise().query(
            "UPDATE registration SET first_login_email_status = 'sending' WHERE id = ? AND first_login_email_status = 'pending'",
            [user.id]
        );
    } catch (error) {
        console.error("Could not claim the first-login email:", error);
        return;
    }

    if (claimResult.affectedRows !== 1) {
        return;
    }

    const firstName = String(user.first_name || "").trim();
    const recipientName = [firstName, user.last_name]
        .filter(Boolean)
        .join(" ");
    const studioName = String(user.studio_name || "").trim();
    const greeting = firstName || "there";
    const senderName = process.env.BREVO_SENDER_NAME || "Dance Studio Management";
    const studioText = studioName
        ? `Your ${studioName} account is ready to use.`
        : "Your account is ready to use.";

    const message = {
        sender: {
            email: senderEmail,
            name: senderName,
        },
        to: [{
            email: user.email,
            ...(recipientName ? { name: recipientName } : {}),
        }],
        subject: "Welcome to Dance Studio Management",
        htmlContent: `<html><body><p>Hello ${escapeHtml(greeting)},</p><p>Welcome to Dance Studio Management. ${escapeHtml(studioText)}</p><p>You can now sign in and manage your studio.</p><p>Regards,<br>${escapeHtml(senderName)}</p></body></html>`,
        textContent: `Hello ${greeting},\n\nWelcome to Dance Studio Management. ${studioText}\n\nYou can now sign in and manage your studio.\n\nRegards,\n${senderName}`,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response;
    try {
        response = await fetch(BREVO_EMAIL_ENDPOINT, {
            method: "POST",
            headers: {
                accept: "application/json",
                "api-key": apiKey,
                "content-type": "application/json",
            },
            body: JSON.stringify(message),
            signal: controller.signal,
        });
    } catch (error) {
        await resetEmailClaim(user.id);
        console.error("Brevo first-login email request failed:", error);
        return;
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        await resetEmailClaim(user.id);
        let providerError = "";
        try {
            const body = await response.json();
            const code = typeof body?.code === "string" ? body.code : "";
            const message = typeof body?.message === "string" ? body.message : "";
            providerError = [code, message].filter(Boolean).join(": ");
        } catch (error) {
            console.error("Could not read Brevo error details:", error);
        }
        console.error(
            `Brevo rejected the first-login email with HTTP ${response.status}${providerError ? `: ${providerError}` : ""}.`
        );
        return;
    }

    try {
        const [result] = await db.promise().query(
            "UPDATE registration SET first_login_email_status = 'sent' WHERE id = ? AND first_login_email_status = 'sending'",
            [user.id]
        );
        if (result.affectedRows !== 1) {
            console.error("Brevo accepted the first-login email, but its status was not updated.");
        }
    } catch (error) {
        console.error("Brevo accepted the first-login email, but its status could not be saved:", error);
    }
}
