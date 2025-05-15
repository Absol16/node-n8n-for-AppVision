import fs from 'fs';
import { existsSync } from 'fs';
import path from 'path';

// Utility function to check if the environment is Docker-based.
const isDocker = () => existsSync('/.dockerenv');

// Define the session file paths based on the environment (Docker or non-Docker).
const SESSION_FILE_MCP = isDocker() ? '/usr/local/lib/node_modules/n8n-nodes-appvision/dist/nodes/AppVision/session/sessionIdMcp.json'
: path.resolve('./dist/nodes/AppVision/session/sessionIdMcp.json');

const SESSION_FILE = isDocker() ? '/usr/local/lib/node_modules/n8n-nodes-appvision/dist/nodes/AppVision/session/sessionId.json'
: path.resolve('./dist/nodes/AppVision/session/sessionId.json');

// Declare intervals for session keep-alive management.
let keepAliveInterval: NodeJS.Timeout | null = null;
let stopKeepAliveTimeout: NodeJS.Timeout | null = null;

/**
 * Function to retrieve the session ID from the session file.
 * @returns {string | null} The session ID if it exists, otherwise null.
 */
function getSession(): string | null {
    try {
        // Check if the session file exists
        if (fs.existsSync(SESSION_FILE)) {
            const data = fs.readFileSync(SESSION_FILE, 'utf-8');
            const parsed = JSON.parse(data) as { sessionId?: string }[];
            
            if (parsed.length > 0 && parsed[0].sessionId) {
                return parsed[0].sessionId;
            } else {
                console.error("Session ID not found in the expected format.");
            }
        } else {
            console.error("Session file not found.");
        }
    } catch (err) {
        console.error("Error reading session from file:", err);
    }
    return null;
}

/**
 * Function to save the session ID to a file.
 * @param {string | null} id The session ID to be saved. If null, it won't save anything.
 */
function saveSessionToFile(id: string | null = null): void {
    try {
        // Ensure the directory exists before saving the file
        const dir = path.dirname(SESSION_FILE_MCP);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // Save the session ID to the file
        fs.writeFileSync(SESSION_FILE_MCP, JSON.stringify({ sessionId: id }, null, 2), 'utf-8');
    } catch (err) {
        console.error("Error saving session to file:", err);
    }
}

/**
 * Function to retrieve the IP address from the session file.
 * @returns {string | null} The IP address if it exists, otherwise null.
 */
function getIp() {
    try {
        // Check if the session file exists
        if (fs.existsSync(SESSION_FILE)) {
            const data = fs.readFileSync(SESSION_FILE, 'utf-8');
            const parsed = JSON.parse(data);
            
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].ip) {
                return parsed[0].ip;
            } else {
                console.error("IP not found in the expected format.");
            }
        } else {
            console.error("Session file not found.");
        }
    } catch (err) {
        console.error("Error reading IP from file:", err);
    }
    return null;
}

/**
 * Function to keep the session alive by periodically sending keep-alive requests.
 * It also handles stopping the keep-alive process after a period of inactivity.
 */
async function keepAlive(): Promise<void> {
    let sessionId: string | null = null;
    const ip = getIp();

    // Load the session ID from the session file
    if (fs.existsSync(SESSION_FILE)) {
        const data = fs.readFileSync(SESSION_FILE, 'utf-8');
        const parsed = JSON.parse(data) as { sessionId?: string };
        if (parsed.sessionId) {
            sessionId = parsed.sessionId;
            console.log("Session loaded from file:", sessionId);
        }
    }

    // If no session ID exists, abort keep-alive
    if (!sessionId) return;

    // Set the interval to send keep-alive requests every 10 seconds
    keepAliveInterval = setInterval(async () => {
        try {
            const res = await fetch(`http://${ip}/AppVisionService.svc/KeepAlive`, {
                method: "GET",
                headers: { 'SessionID': sessionId ?? '' },
            });

            if (!res.ok) throw new Error(`KeepAlive failed with status ${res.status}`);
            console.log("KeepAlive sent.");
        } catch (err) {
            console.error("KeepAlive error:", err, ip, sessionId);
        }
    }, 10000);

    // Set a timeout to stop keep-alive after 5 minutes of inactivity
    stopKeepAliveTimeout = setTimeout(() => {
        console.log("No activity in 5 minutes. Stopping keep-alive...");
        stopKeepAlive();
    }, 5 * 60 * 1000);
}

/**
 * Function to stop the keep-alive process and log out the session.
 */
async function stopKeepAlive(): Promise<void> {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        console.log("Keep-alive stopped.");
    }

    if (stopKeepAliveTimeout) {
        clearTimeout(stopKeepAliveTimeout);
        stopKeepAliveTimeout = null;
    }

    const sessionId = getSession();
    const ip = getIp();

    // If session ID and IP exist, log out the session
    if (sessionId && ip) {
        try {
            const res = await fetch(`http://${ip}/AppVisionService.svc/Logout`, {
                method: "GET",
                headers: { 'SessionID': sessionId }
            });

            if (!res.ok) throw new Error(`Logout failed with status ${res.status}`);
            console.log("Logged out successfully.");
        } catch (err) {
            console.error("Logout error:", err);
        }
        removeSession();
    }
}

/**
 * Function to remove the session file.
 */
function removeSession(): void {
    try {
        fs.unlinkSync(SESSION_FILE); // Remove session file
        console.log("Session removed.");
    } catch (err) {
        console.error("Error removing session:", err);
    }
}

export {
    saveSessionToFile,
    getSession,
    keepAlive,
    stopKeepAlive,
    isDocker,
    getIp,
};
