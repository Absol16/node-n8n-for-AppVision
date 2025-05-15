import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DOMParser } from 'xmldom';
import { keepAlive, saveSessionToFile, getSession, getIp } from "./sessionManager.js";
import { getSessionAndHeaders } from './utils.js';
// Initialize the MCP server with its name, version, and capabilities.
const server = new McpServer({
    name: "AppVision", // Server name
    version: "1.0.1", // Server version
    capabilities: {
        resources: {}, // Define the resources that the server can access (empty in this case)
        tools: {}, // Define the tools that the server can use (empty in this case)
    },
});
/**
 * Helper function to send a request to the AppVision service.
 * @param url - The URL to send the request to.
 * @param method - The HTTP method ('GET' or 'POST'). Default is 'GET'.
 * @param headers - The headers to send with the request. Default is an empty object.
 * @param body - The body to send with the request (for POST requests). Default is null.
 * @returns The response text as a string or null if there is no response.
 */
async function AppVisionRequest(url, method = 'GET', headers = {}, body = null) {
    try {
        // Set the request options, including headers and method.
        const requestOptions = {
            method,
            headers: {
                'Content-Type': 'application/xml', // The content type of the request
                ...headers, // Additional headers
            },
        };
        // If the body is not null, include it in the request options.
        if (body) {
            requestOptions.body = body;
        }
        // Send the request to the AppVision service.
        const response = await fetch(url, requestOptions);
        // Check if the response status is OK (200-299).
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const responseText = await response.text();
        // If there is no response text, return null.
        if (!responseText) {
            return null;
        }
        // Return the response as a string (cast as T).
        return responseText;
    }
    catch (error) {
        console.error("Error connecting to AppVision:", error);
        return null;
    }
}
// Define the tool 'get-profile-by-name' in the MCP server.
server.tool("get-profile-by-name", // Tool name
"Get a specific profile by name from the AppVision client", // Tool description
{
    name: z.string().describe("The name of the profile to retrieve"), // Input: here for exemple it's the profile name
}, async ({ name }) => {
    // Fetch session data and headers using the 'getSessionAndHeaders' function from utils.ts
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    // If no session ID is available, return a message indicating that login is required.
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    // Construct the URL to request the profile by name from the AppVision service.
    const url = `http://${ip}/AppVisionService.svc/GetProfileByName?name=${name}`;
    try {
        // Call the 'AppVisionRequest' function to retrieve.
        const response = await AppVisionRequest(url, "GET", headers);
        // If no response is returned, notify that no profile was found with the given name.
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No profile found with name: ${name}.`,
                    },
                ],
            };
        }
        // If the profile is successfully retrieved, return a success message with the profile data.
        return {
            content: [
                {
                    type: "text",
                    text: `Profile retrieved successfully: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        // If there is an error during the request, return an error message with details.
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting profile by name ${name}: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-profile-by-id", "Get a specific profile by ID from the AppVision client", {
    id: z.string().describe("The ID of the profile to retrieve"),
}, async ({ id }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetProfileById?id=${id}`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No profile found for ID: ${id}.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Profile retrieved successfully: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting profile for ID ${id}: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-profiles", "Get all profiles from the AppVision client", {
    name: z.string().optional()
}, async () => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetProfiles`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No profiles found.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Profiles retrieved successfully: ${response}`,
                }
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting profiles: ${err}`,
                },
            ],
        };
    }
});
server.tool("add-variables", "Add variables to the AppVision client", {
    update: z.boolean().describe("Indicate if existing variables should be updated (true/false)"),
    Id: z.number().describe("ID of the variable"),
    Name: z.string().describe("Name of the variable"),
    Description: z.string().optional().describe("Description of the variable"),
}, async ({ update, Id, Name, Description }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/AddVariables?update=${update}`;
    const xmlBody = `
      <ArrayOfVariableRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
          <VariableRow>
            <Id>${Id}</Id>
            <Name>${Name}</Name>
            <Description>${Description || ''}</Description>
          </VariableRow>
      </ArrayOfVariableRow>
    `;
    try {
        const response = await AppVisionRequest(url, "POST", headers, xmlBody);
        if (response && response === 'false') {
            return {
                content: [
                    {
                        type: "text",
                        text: "Variables added successfully.",
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to add variables.",
                    },
                ],
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error adding variables: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-variables-excluded", "Get variables excluded from AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetVariablesExcluded`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No excluded variables found.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Excluded variables: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving excluded variables: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-variables-by-protocol", "Get variables from AppVision client by protocol", {
    protocolName: z.string().describe("The name of the protocol to filter variables by"),
}, async ({ protocolName }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetVariablesByProtocol`);
    url.searchParams.append('protocolName', protocolName);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No variables found for the protocol ${protocolName}.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Variables retrieved for protocol ${protocolName}: ${response}`, // Affichage des variables récupérées
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving variables for protocol ${protocolName}: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-variables-by-filter", "Get variables from AppVision client by filter", {
    filters: z.string().describe("Comma separated list of filters to apply, for example: $A.Area1,$G.Group1,$V.Variable1"),
}, async ({ filters }) => {
    // Récupérer la session et les en-têtes
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetVariablesByFilter`);
    url.searchParams.append('filters', filters);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No variables found for the specified filters.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Variables retrieved with filters: ${response}`, // Affichage des variables récupérées
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving variables: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-variables-by-types", "Get variables from AppVision client by types", {
    types: z.string().describe("type for variables to filtre"),
}, async ({ types }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetVariablesByTypes`);
    url.searchParams.append('types', types);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No variables found for the specified types.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Variables retrieved: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving variables: ${err}`,
                },
            ],
        };
    }
});
// Area Request
server.tool("get-area-states", "Get all area states from the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name of the Area, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId || "";
    const ip = sessionData?.ip || "";
    const headers = sessionData?.headers || {};
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetAreaStates`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve area states.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `area states: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting variable states: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-area-state-count", "Get the area state count from the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name of the Area, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetAreaStateCount`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve area state count.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Area state count: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting area state count: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-area-row-count", "Get the Area row count from the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name of the Area, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetAreaRowCount`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve area row count.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Area row count: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Area row count: ${err}`,
                },
            ],
        };
    }
});
server.tool("delete-Area", "Delete an existing Area from AppVision client", {
    id: z.number().describe("ID of the Area to delete"),
    name: z.string().describe("The name of the Area to delete"),
}, async ({ id, name }) => {
    // On commence par récupérer la session et les en-têtes
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/DeleteArea`);
    // Préparation du corps de la requête XML
    const xmlBody = `
      <AreaRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Id>${id}</Id>
        <Name>${name}</Name>
      </AreaRow>
    `;
    try {
        const response = await AppVisionRequest(url.toString(), "POST", headers, xmlBody);
        // Vérification de la réponse
        if (response === 'true') {
            return {
                content: [
                    {
                        type: "text",
                        text: `Area with ID: ${id} and Name: ${name} deleted successfully.`,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to delete the Area with ID: ${id} and Name: ${name}.`,
                    },
                ],
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error deleting Area: ${err}`,
                },
            ],
        };
    }
});
server.tool("update-area", "Update an existing Area or create it if not found in AppVision client", {
    id: z.string().optional().describe("ID of the Area"),
    name: z.string().describe("The name of the Area"),
    description: z.string().describe("The description of the Area"),
}, async ({ id, name, description }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/UpdateArea`);
    const xmlBody = `
      <AreaRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Id>${id}</Id>
        <Name>${name}</Name>
        <Description>${description}</Description>
      </AreaRow>
    `;
    try {
        const response = await AppVisionRequest(url.toString(), "POST", headers, xmlBody);
        if (response === 'true') {
            return {
                content: [
                    {
                        type: "text",
                        text: "Area updated successfully.",
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to update the Area.",
                    },
                ],
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error updating Area: ${err}`,
                },
            ],
        };
    }
});
server.tool("add-Area", "Add a new Area in AppVision client", {
    name: z.string().describe("Name of the Area"),
    description: z.string().describe("Description of the Area"),
}, async ({ name, description }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/AddArea`;
    const body = `
      <AreaRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Name>${name}</Name>
        <Description>${description}</Description>
      </AreaRow>
    `;
    const response = await AppVisionRequest(url, "POST", headers, body);
    if (response) {
        return {
            content: [
                {
                    type: "text",
                    text: `Area ${name} added or updated successfully. ${response}`,
                },
            ],
        };
    }
    else {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to add or update the Area ${name}.`,
                },
            ],
        };
    }
});
server.tool("get-Area-state-by-name", "Get Area state by name from AppVision client", {
    name: z.string().describe("Name of the Area whose state is to be retrieved"),
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetAreaStateByName`);
    url.searchParams.append('name', name);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No Area state found for the given name: ${name}.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Area state for ${name}: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Area state by name: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-area-by-name", "Get a Area by name from AppVision client", {
    name: z.string().optional().describe("Area name to retrieve the Area information"),
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    let url;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    if (name == null) {
        url = new URL(`http://${ip}/AppVisionService.svc/GetArea`);
    }
    else {
        url = new URL(`http://${ip}/AppVisionService.svc/GetAreaByName`);
        url.searchParams.append('name', name);
    }
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Area not found.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Area found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Area by name: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-area-state-by-id", "Get area state by ID from AppVision client", {
    id: z.string().describe("ID of the Area whose state is to be retrieved"),
}, async ({ id }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetAreaStateById`);
    url.searchParams.append('id', id);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No Area state found for the given ID: ${id}.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Area state for ID ${id}: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Area state by ID: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-Area-states-by-name", "Get Area states by name pattern from AppVision client", {
    pattern: z.string().describe("Pattern name with a wildcard to filter Area, e.g., G1.*"),
}, async ({ pattern }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetAreaStatesByName`);
    url.searchParams.append('patternName', pattern);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No Area states found for the given pattern.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Area states found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Area states by name: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-Area-by-guid", "Get a Area by GUID from AppVision client", {
    guid: z.string().describe("GUID of the Area to retrieve the Area information"),
}, async ({ guid }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetAreaByGuid`);
    url.searchParams.append('guid', guid);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Area not found for the given GUID.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Area found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Area by GUID: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-Area-by-id", "Get a Area by ID from AppVision client", {
    id: z.string().describe("Area ID to retrieve the Area information"),
}, async ({ id }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetAreaById`);
    url.searchParams.append('id', id);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Area not found.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Area found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Variable by ID: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-Areas-by-name", "Get Areas by pattern name from AppVision client", {
    patternName: z.string().describe("Pattern name with generic character (e.g., G1.*)"),
}, async ({ patternName }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetAreasByName`);
    url.searchParams.append('patternName', patternName);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No Areas found matching the pattern.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Areas found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Areas: ${err}`,
                },
            ],
        };
    }
});
// Variable Request
server.tool("get-variable-states", "Get all variable states from the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name of the variable, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetVariableStates`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve variable states.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Variable states: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting variable states: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-variable-state-count", "Get the variable state count from the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name of the variable, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetVariableStateCount`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve variable state count.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Variable state count: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting variable state count: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-variable-row-count", "Get the variable row count from the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name of the Variable, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetVariableRowCount`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve variable row count.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `variable row count: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting variable row count: ${err}`,
                },
            ],
        };
    }
});
server.tool("delete-variable", "Delete an existing variable from AppVision client", {
    id: z.number().describe("ID of the variable to delete"),
    name: z.string().describe("The name of the variable to delete"),
}, async ({ id, name }) => {
    // On commence par récupérer la session et les en-têtes
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/DeleteVariable`);
    // Préparation du corps de la requête XML
    const xmlBody = `
      <VariableRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Id>${id}</Id>
        <Name>${name}</Name>
      </VariableRow>
    `;
    try {
        const response = await AppVisionRequest(url.toString(), "POST", headers, xmlBody);
        // Vérification de la réponse
        if (response === 'true') {
            return {
                content: [
                    {
                        type: "text",
                        text: `Variable with ID: ${id} and Name: ${name} deleted successfully.`,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to delete the Variable with ID: ${id} and Name: ${name}.`,
                    },
                ],
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error deleting Variable: ${err}`,
                },
            ],
        };
    }
});
server.tool("update-variable", "Update an existing variable or create it if not found in AppVision client", {
    id: z.number().optional().describe("ID of the variable"),
    name: z.string().describe("The name of the variable"),
    description: z.string().describe("The description of the variable"),
}, async ({ id, name, description }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/UpdateVariable`);
    const xmlBody = `
      <VariableRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Id>${id}</Id>
        <Name>${name}</Name>
        <Description>${description}</Description>
      </VariableRow>
    `;
    try {
        const response = await AppVisionRequest(url.toString(), "POST", headers, xmlBody);
        if (response === 'true') {
            return {
                content: [
                    {
                        type: "text",
                        text: "Variable updated successfully.",
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to update the Variable.",
                    },
                ],
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error updating Variable: ${err}`,
                },
            ],
        };
    }
});
server.tool("add-variable", "Add a new Variable in AppVision client", {
    name: z.string().describe("Name of the variable"),
    description: z.string().describe("Description of the variable"),
}, async ({ name, description }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/AddVariable`;
    const body = `
      <VariableRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Name>${name}</Name>
        <Description>${description}</Description>
      </VariableRow>
    `;
    const response = await AppVisionRequest(url, "POST", headers, body);
    if (response) {
        return {
            content: [
                {
                    type: "text",
                    text: `Variable ${name} added or updated successfully. ${response}`,
                },
            ],
        };
    }
    else {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to add or update the variable ${name}.`,
                },
            ],
        };
    }
});
server.tool("get-variable-state-by-name", "Get variable state by name from AppVision client", {
    name: z.string().describe("Name of the variable whose state is to be retrieved"),
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetVariableStateByName`);
    url.searchParams.append('name', name);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No variable state found for the given name: ${name}.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Variable state for ${name}: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Variable state by name: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-variable-by-name", "Get a variable by name from AppVision client", {
    name: z.string().optional().describe("Variable name to retrieve the variable information"),
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    let url;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    if (name == null) {
        url = new URL(`http://${ip}/AppVisionService.svc/GetVariables`);
    }
    else {
        url = new URL(`http://${ip}/AppVisionService.svc/GetVariableByName`);
        url.searchParams.append('name', name);
    }
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Variable not found.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Variable found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting variable by name: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-variable-state-by-id", "Get variable state by ID from AppVision client", {
    id: z.string().describe("ID of the variable whose state is to be retrieved"),
}, async ({ id }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetVariableStateById`);
    url.searchParams.append('id', id);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No variable state found for the given ID: ${id}.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Variable state for ID ${id}: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting variable state by ID: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-variable-states-by-name", "Get variable states by name pattern from AppVision client", {
    pattern: z.string().describe("Pattern name with a wildcard to filter Variables, e.g., G1.*"),
}, async ({ pattern }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetVariableStatesByName`);
    url.searchParams.append('patternName', pattern);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No Variable states found for the given pattern.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Variable states found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Variable states by name: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-Variable-by-guid", "Get a Variable by GUID from AppVision client", {
    guid: z.string().describe("GUID of the Variable to retrieve the Variable information"),
}, async ({ guid }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetVariableByGuid`);
    url.searchParams.append('guid', guid);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Variable not found for the given GUID.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Variable found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Variable by GUID: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-Variable-by-id", "Get a Variable by ID from AppVision client", {
    id: z.string().describe("Variable ID to retrieve the Variable information"),
}, async ({ id }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetVariableById`);
    url.searchParams.append('id', id);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Variable not found.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Variable found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Variable by ID: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-Variables-by-name", "Get Variables by pattern name from AppVision client", {
    patternName: z.string().describe("Pattern name with generic character (e.g., G1.*)"),
}, async ({ patternName }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetVariablesByName`);
    url.searchParams.append('patternName', patternName);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No Variables found matching the pattern.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Variables found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Variables: ${err}`,
                },
            ],
        };
    }
});
// Group Request
server.tool("get-group-states", "Get all group states from the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name of the group, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetGroupStates`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve group states.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Group states: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting group states: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-group-state-count", "Get the group state count from the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name of the group, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetGroupStateCount`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve group state count.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Group state count: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting group state count: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-group-row-count", "Get the group row count from the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name of the group, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetGroupRowCount`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve group row count.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Group row count: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting group row count: ${err}`,
                },
            ],
        };
    }
});
server.tool("delete-group", "Delete an existing group from AppVision client", {
    id: z.number().describe("ID of the group to delete"),
    name: z.string().describe("The name of the group to delete"),
}, async ({ id, name }) => {
    // On commence par récupérer la session et les en-têtes
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/DeleteGroup`);
    // Préparation du corps de la requête XML
    const xmlBody = `
      <GroupRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Id>${id}</Id>
        <Name>${name}</Name>
      </GroupRow>
    `;
    try {
        const response = await AppVisionRequest(url.toString(), "POST", headers, xmlBody);
        // Vérification de la réponse
        if (response === 'true') {
            return {
                content: [
                    {
                        type: "text",
                        text: `Group with ID: ${id} and Name: ${name} deleted successfully.`,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to delete the group with ID: ${id} and Name: ${name}.`,
                    },
                ],
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error deleting group: ${err}`,
                },
            ],
        };
    }
});
server.tool("update-group", "Update an existing group or create it if not found in AppVision client", {
    id: z.number().describe("ID of the group"),
    name: z.string().describe("The name of the group"),
    description: z.string().describe("The description of the group"),
}, async ({ id, name, description }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/UpdateGroup`);
    const xmlBody = `
      <GroupRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Id>${id}</Id>
        <Name>${name}</Name>
        <Description>${description}</Description>
      </GroupRow>
    `;
    try {
        const response = await AppVisionRequest(url.toString(), "POST", headers, xmlBody);
        if (response === 'true') {
            return {
                content: [
                    {
                        type: "text",
                        text: "Group updated successfully.",
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to update the group.",
                    },
                ],
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error updating group: ${err}`,
                },
            ],
        };
    }
});
server.tool("add-group", "Add a new group in AppVision client", {
    name: z.string().describe("Name of the group"),
    description: z.string().describe("Description of the group"),
}, async ({ name, description }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/AddGroup`;
    const body = `
      <GroupRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Name>${name}</Name>
        <Description>${description}</Description>
      </GroupRow>
    `;
    const response = await AppVisionRequest(url, "POST", headers, body);
    if (response) {
        return {
            content: [
                {
                    type: "text",
                    text: `Group ${name} added or updated successfully. ${response}`,
                },
            ],
        };
    }
    else {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to add or update the group ${name}.`,
                },
            ],
        };
    }
});
server.tool("get-group-state-by-name", "Get group state by name from AppVision client", {
    name: z.string().describe("Name of the group whose state is to be retrieved"),
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetGroupStateByName`);
    url.searchParams.append('name', name);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No group state found for the given name: ${name}.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Group state for ${name}: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting group state by name: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-group-by-name", "Get a group by name from AppVision client", {
    name: z.string().optional().describe("Group name to retrieve the group information"),
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    let url;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    if (name == null) {
        url = new URL(`http://${ip}/AppVisionService.svc/GetGroups`);
    }
    else {
        url = new URL(`http://${ip}/AppVisionService.svc/GetGroupByName`);
        url.searchParams.append('name', name);
    }
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Group not found.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Group found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting group by name: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-group-state-by-id", "Get group state by ID from AppVision client", {
    id: z.string().describe("ID of the group whose state is to be retrieved"),
}, async ({ id }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetGroupStateById`);
    url.searchParams.append('id', id);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No group state found for the given ID: ${id}.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Group state for ID ${id}: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting group state by ID: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-group-states-by-name", "Get group states by name pattern from AppVision client", {
    pattern: z.string().describe("Pattern name with a wildcard to filter groups, e.g., G1.*"),
}, async ({ pattern }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetGroupStatesByName`);
    url.searchParams.append('patternName', pattern);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No group states found for the given pattern.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Group states found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting group states by name: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-group-by-guid", "Get a group by GUID from AppVision client", {
    guid: z.string().describe("GUID of the group to retrieve the group information"),
}, async ({ guid }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetGroupByGuid`);
    url.searchParams.append('guid', guid);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Group not found for the given GUID.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Group found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting group by GUID: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-group-by-id", "Get a group by ID from AppVision client", {
    id: z.string().describe("Group ID to retrieve the group information"),
}, async ({ id }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetGroupById`);
    url.searchParams.append('id', id);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Group not found.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Group found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting group by ID: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-groups-by-name", "Get groups by pattern name from AppVision client", {
    patternName: z.string().describe("Pattern name with generic character (e.g., G1.*)"),
}, async ({ patternName }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetGroupsByName`);
    url.searchParams.append('patternName', patternName);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No groups found matching the pattern.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Groups found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting groups: ${err}`,
                },
            ],
        };
    }
});
//Protocol Request
server.tool("get-protocol-states", "Get all protocol states from the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name of the protocol, if there is not name just use the tool anyway")
}, async () => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId || "";
    const ip = sessionData?.ip || "";
    const headers = sessionData?.headers || {};
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetProtocolStates`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve protocol states.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Protocol states: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting protocol states: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-protocol-state-count", "Get the protocol state count from the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name of the protocol, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetProtocolStateCount`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve protocol state count.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Protocol state count: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting protocol state count: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-protocol-row-count", "Get the protocol row count from the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name of the protocol, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetProtocolRowCount`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve protocol row count.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Protocol row count: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting protocol row count: ${err}`,
                },
            ],
        };
    }
});
server.tool("delete-Protocol", "Delete an existing Protocol from AppVision client", {
    id: z.number().describe("ID of the Protocol to delete"),
    name: z.string().describe("The name of the Protocol to delete"),
}, async ({ id, name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/DeleteProtocol`);
    // Préparation du corps de la requête XML
    const xmlBody = `
      <ProtocolRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Id>${id}</Id>
        <Name>${name}</Name>
      </ProtocolRow>
    `;
    try {
        const response = await AppVisionRequest(url.toString(), "POST", headers, xmlBody);
        // Vérification de la réponse
        if (response === 'true') {
            return {
                content: [
                    {
                        type: "text",
                        text: `Protocol with ID: ${id} and Name: ${name} deleted successfully.`,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to delete the Protocol with ID: ${id} and Name: ${name}.`,
                    },
                ],
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error deleting Protocol: ${err}`,
                },
            ],
        };
    }
});
server.tool("update-Protocol", "Update an existing Protocol or create it if not found in AppVision client", {
    id: z.number().describe("ID of the Protocol"),
    name: z.string().describe("The name of the Protocol"),
    description: z.string().describe("The description of the Protocol"),
}, async ({ id, name, description }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/UpdateProtocol`);
    const xmlBody = `
      <ProtocolRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Id>${id}</Id>
        <Name>${name}</Name>
        <Description>${description}</Description>
      </ProtocolRow>
    `;
    try {
        const response = await AppVisionRequest(url.toString(), "POST", headers, xmlBody);
        if (response === 'true') {
            return {
                content: [
                    {
                        type: "text",
                        text: "Protocol updated successfully.",
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to update the Protocol.",
                    },
                ],
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error updating Protocol: ${err}`,
                },
            ],
        };
    }
});
server.tool("add-Protocol", "Add a new Protocol in AppVision client", {
    name: z.string().describe("Name of the Protocol"),
    description: z.string().describe("Description of the Protocol"),
}, async ({ name, description }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/AddProtocol`;
    const body = `
      <ProtocolRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Name>${name}</Name>
        <Description>${description}</Description>
      </ProtocolRow>
    `;
    const response = await AppVisionRequest(url, "POST", headers, body);
    if (response) {
        return {
            content: [
                {
                    type: "text",
                    text: `Protocol ${name} added or updated successfully. ${response}`,
                },
            ],
        };
    }
    else {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to add or update the Protocol ${name}.`,
                },
            ],
        };
    }
});
server.tool("get-Protocol-state-by-name", "Get Protocol state by name from AppVision client", {
    name: z.string().describe("Name of the Protocol whose state is to be retrieved"),
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetProtocolStateByName`);
    url.searchParams.append('name', name);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No Protocol state found for the given name: ${name}.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Protocol state for ${name}: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Protocol state by name: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-Protocol-by-name", "Get a Protocol by name from AppVision client", {
    name: z.string().optional().describe("Protocol name to retrieve the Protocol information"),
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    let url;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    if (name == null) {
        url = new URL(`http://${ip}/AppVisionService.svc/GetProtocols`);
    }
    else {
        url = new URL(`http://${ip}/AppVisionService.svc/GetProtocolByName`);
        url.searchParams.append('name', name);
    }
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Protocol not found.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Protocol found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Protocol by name: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-Protocol-state-by-id", "Get Protocol state by ID from AppVision client", {
    id: z.string().describe("ID of the Protocol whose state is to be retrieved"),
}, async ({ id }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetProtocolStateById`);
    url.searchParams.append('id', id);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No Protocol state found for the given ID: ${id}.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Protocol state for ID ${id}: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Protocol state by ID: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-Protocol-states-by-name", "Get Protocol states by name pattern from AppVision client", {
    pattern: z.string().describe("Pattern name with a wildcard to filter Protocols, e.g., G1.*"),
}, async ({ pattern }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetProtocolStatesByName`);
    url.searchParams.append('patternName', pattern);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No group states found for the given pattern.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Protocol states found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Protocol states by name: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-Protocol-by-guid", "Get a Protocol by GUID from AppVision client", {
    guid: z.string().describe("GUID of the Protocol to retrieve the Protocol information"),
}, async ({ guid }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetProtocolByGuid`);
    url.searchParams.append('guid', guid);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Protocol not found for the given GUID.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Protocol found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Protocol by GUID: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-Protocol-by-id", "Get a Protocol by ID from AppVision client", {
    id: z.string().describe("Protocol ID to retrieve the Protocol information"),
}, async ({ id }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetProtocolById`);
    url.searchParams.append('id', id);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Protocol not found.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Protocol found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Protocol by ID: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-Protocols-by-name", "Get Protocols by pattern name from AppVision client", {
    patternName: z.string().describe("Pattern name with generic character (e.g., G1.*)"),
}, async ({ patternName }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetProtocolsByName`);
    url.searchParams.append('patternName', patternName);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No Protocols found matching the pattern.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Protocols found: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting Protocols: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-current-protocol", "Get current protocol from AppVision client", {
    name: z.string().optional(),
}, async ({}) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetCurrentProtocol`);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No protocol connected.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Current protocol: ${response}`, // Affichage des données du protocole
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting protocol: ${err}`,
                },
            ],
        };
    }
});
server.tool("check-connection", "check if the AppVision server is available", {
    name: z.string().optional().describe("(optional) name")
}, async ({ name }) => {
    // Récupérer les informations de session et d'en-têtes
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    // Construire l'URL du serveur AppVision
    const serverUrl = `http://${ip}/AppVisionService.svc/Open?clientProductName=TestClient`;
    // Faire la requête pour vérifier la disponibilité du serveur
    const result = await AppVisionRequest(serverUrl, "GET", headers);
    const statusText = result
        ? "AppVision server is available."
        : "AppVision server is NOT reachable.";
    if (!result) {
        return {
            content: [{ type: "text", text: `Failed to retrieve alarmid ${result}.` }],
        };
    }
    return {
        content: [
            {
                type: "text",
                text: result,
            },
        ],
    };
});
server.tool("get-alarms-event", "get the alarm Event", {
    alarmId: z.string().describe('The id of the alarm we want to get the event')
}, async ({ alarmId }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const serverUrl = new URL(`http://${ip}/AppVisionService.svc/GetAlarmEvents`);
    serverUrl.searchParams.append('alarmId', alarmId);
    const result = await AppVisionRequest(serverUrl.toString(), "GET", headers);
    if (!result) {
        return {
            content: [{ type: "text", text: `Failed to retrieve alarmid ${result}.` }],
        };
    }
    return {
        content: [{ type: "text", text: result }],
    };
});
server.tool("get-current-user", "get current user in the server Appvision", {
    name: z.string().optional().describe("(optional) name")
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const serverUrl = `http://${ip}/AppVisionService.svc/GetCurrentUser`;
    try {
        const result = await AppVisionRequest(serverUrl, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve current users.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: result,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error while fetching current users: ${error.message}`,
                },
            ],
        };
    }
});
server.tool("get-histo-event-by-id", "Get the historical event data by event ID", {
    eventId: z.string().describe("The ID of the event to retrieve history for")
}, async ({ eventId }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetHistoEventById`);
    url.searchParams.append('eventId', eventId);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Historical event data for ID ${eventId}: ${response}`
                    }
                ]
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `No history found for event ID ${eventId}.`
                    }
                ]
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving event history: ${err}`
                }
            ]
        };
    }
});
server.tool("logout-session", "to logout from Appvision", {
    name: z.string().optional().describe("(optional) name")
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    try {
        let serverUrl = `http://${ip}/AppVisionService.svc/Logout`;
        await AppVisionRequest(serverUrl, "GET", headers);
        serverUrl = `http://${ip}/AppVisionService.svc/Close`;
        await AppVisionRequest(serverUrl, "GET", headers);
        return {
            content: [{ type: "text", text: `logout successfully.` }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error logout ${err}` }],
        };
    }
});
server.tool("remove-all-alarms", "Tools that remove all alarms", {
    name: z.string().optional().describe("an optional argument"),
}, async ({ name }) => {
    keepAlive();
    const sessionId = getSession();
    const ip = getIp();
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                },
            ],
        };
    }
    const headers = {
        'SessionID': sessionId,
        'Content-Type': 'application/xml',
    };
    const serverUrl = `http://${ip}/AppVisionService.svc/RemoveAllAlarms`;
    try {
        const response = await AppVisionRequest(serverUrl, "GET", headers);
        if (response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `All alarms have been removed: ${response}`
                    }
                ]
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `No Alarms have been removed.`
                    }
                ]
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving event history: ${err}`
                }
            ]
        };
    }
});
server.tool("cancel-alarm", "Cancel an alarm in the AppVision client", {
    id: z.string().describe("The ID of the alarm to cancel"),
    comment: z.string().describe("A comment to explain why the alarm is being cancelled")
}, async ({ id, comment }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const headers = {
        'SessionID': sessionId,
        'Content-Type': 'application/xml',
        'Content-Length': Buffer.byteLength(comment, 'utf8').toString()
    };
    const body = `<string xmlns="http://schemas.microsoft.com/2003/10/Serialization/">${comment}</string>`;
    const url = new URL(`http://${ip}/AppVisionService.svc/CancelAlarm`);
    url.searchParams.append('id', id);
    try {
        await AppVisionRequest(url.toString(), "POST", headers, body);
        return {
            content: [
                {
                    type: "text",
                    text: `Alarm with ID ${id} cancelled successfully.`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error cancelling alarm: ${err}`
                }
            ]
        };
    }
});
server.tool("get-histo-alarm-by-id", "Get the historical alarm data by alarm ID", {
    alarmId: z.string().describe("The ID of the alarm to retrieve history for")
}, async ({ alarmId }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/GetHistoAlarmById`);
    url.searchParams.append('alarmId', alarmId);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        if (response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Historical alarm data for ID ${alarmId}: ${response}`
                    }
                ]
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `No history found for alarm ID ${alarmId}.`
                    }
                ]
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving alarm history: ${err}`
                }
            ]
        };
    }
});
server.tool("resume-alarm-by-id", "Resume an alarm in the AppVision client by ID", {
    id: z.string().describe("The ID of the alarm to resume"),
    transferUserId: z.string().optional().describe("The user ID to resume the alarm, or 0 for the current user")
}, async ({ id, transferUserId }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/ResumeAlarmById`);
    url.searchParams.append('id', id);
    url.searchParams.append('transferUserId', transferUserId || '0');
    try {
        await AppVisionRequest(url.toString(), "GET", headers);
        return {
            content: [
                {
                    type: "text",
                    text: `Alarm with ID ${id} resumed successfully.`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error resuming alarm: ${err}`
                }
            ]
        };
    }
});
server.tool("acknowledge-alarm-by-id", "Acknowledge an alarm in the AppVision client by ID", {
    id: z.string().describe("The ID of the alarm to acknowledge")
}, async ({ id }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/AcknowledgeAlarmById`);
    url.searchParams.append('id', id);
    try {
        await AppVisionRequest(url.toString(), "GET", headers);
        return {
            content: [
                {
                    type: "text",
                    text: `Alarm with ID ${id} acknowledged successfully.`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error acknowledging alarm: ${err}`
                }
            ]
        };
    }
});
server.tool("acknowledge-alarm-by-name", "Acknowledge alarms in the AppVision client by Name (Area, Group, or Variable)", {
    opName: z.string().describe("The name of the area, group, or variable to acknowledge")
}, async ({ opName }) => {
    keepAlive();
    const sessionId = getSession();
    const ip = getIp();
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const headers = {
        'SessionID': sessionId,
        'Content-Type': 'application/xml'
    };
    const url = new URL(`http://${ip}/AppVisionService.svc/AcknowledgeAlarmByName`);
    url.searchParams.append('opName', opName);
    try {
        await AppVisionRequest(url.toString(), "POST", headers);
        return {
            content: [
                {
                    type: "text",
                    text: `Alarm with operation name ${opName} acknowledged successfully.`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error acknowledging alarm: ${err}`
                }
            ]
        };
    }
});
server.tool("get-current-alarms", "Get current alarms on Appvision client", {
    name: z.string().optional().describe("An optional argument"),
}, async ({ name }) => {
    keepAlive();
    const sessionId = getSession();
    const ip = getIp();
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const headers = {
        'SessionID': sessionId,
        'Content-Type': 'application/xml',
    };
    const serverUrl = `http://${ip}/AppVisionService.svc/GetCurrentAlarms`;
    try {
        const result = await AppVisionRequest(serverUrl, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve current alarms.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: result,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error while fetching current alarms: ${error.message}`,
                },
            ],
        };
    }
});
server.tool("mask-alarm", "Mask or unmask an alarm in the AppVision client", {
    opName: z.string().describe("The name of the operation (e.g., $V.{variable_name}, $A.{area_name}, $G.{group_name})"),
    isMasked: z.boolean().describe("True to mask the alarm, false to unmask"),
    tempo: z.number().describe("Temporization in milliseconds for masking, 0 for no temporization")
}, async ({ opName, isMasked, tempo }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = new URL(`http://${ip}/AppVisionService.svc/MaskAlarm`);
    url.searchParams.append('opName', opName);
    url.searchParams.append('isMasked', isMasked.toString());
    url.searchParams.append('tempo', tempo.toString());
    try {
        await AppVisionRequest(url.toString(), "GET", headers);
        return {
            content: [
                {
                    type: "text",
                    text: `Alarm for '${opName}' has been ${isMasked ? 'masked' : 'unmasked'} successfully.`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error masking/unmasking alarm: ${err}`
                }
            ]
        };
    }
});
server.tool("send-command-to-client", "Send a command to the AppVision client", {
    clientName: z.string().describe("The client host name or protocol name starting with $P if applicable"),
    command: z.string().describe("The command to send to the client"),
    parameter: z.string().describe("Comma-separated parameters for the command")
}, async ({ clientName, command, parameter }) => {
    keepAlive();
    const sessionId = getSession();
    const ip = getIp();
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const headers = {
        'SessionID': sessionId,
        'Content-Type': 'application/xml'
    };
    const url = new URL(`http://${ip}/AppVisionService.svc/SendCommandToClient`);
    url.searchParams.append('clientName', clientName);
    url.searchParams.append('command', command);
    url.searchParams.append('parameter', parameter);
    try {
        const response = await AppVisionRequest(url.toString(), "GET", headers);
        return {
            content: [
                {
                    type: "text",
                    text: `Command '${command}' sent successfully to client '${clientName}'.`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error sending command: ${err}`
                }
            ]
        };
    }
});
server.tool("get-notification", "get notification from AppVision client", {
    name: z.string().describe("optional name"),
}, async ({ name }) => {
    keepAlive();
    const sessionId = getSession();
    const ip = getIp();
    if (!sessionId) {
        return {
            content: [{ type: "text", text: `No active session. Please log in first.` }],
        };
    }
    const headers = {
        'SessionID': sessionId,
        'Content-Type': 'application/xml',
    };
    console.log("GetNotification sessionId:", sessionId);
    let serverUrl = `http://${ip}/AppVisionService.svc/GetNotifications?count=10`;
    const result = await AppVisionRequest(serverUrl, "GET", headers);
    if (!result) {
        return {
            content: [{ type: "text", text: `Failed to retrieve notifications.` }],
        };
    }
    return {
        content: [{ type: "text", text: result }],
    };
});
server.tool("set-variable", "Set a variable in the AppVision client. When executed succesfully call", {
    name: z.string().describe("Variable name"),
    newValue: z.string().describe("The new value for the variable"),
    info: z.string().optional().describe("Additional information"),
    operation: z.string().optional().describe("Operation type (empty, @INIT, @CHANGEONLY)"),
    severity: z.string().optional().describe("Severity of the alarm (0 to 100)"),
    quality: z.string().optional().describe("Quality of the state (0 to 255)"),
}, async ({ name, newValue, info, operation, severity, quality }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const now = new Date();
    const date = now.toISOString();
    const url = new URL(`http://${ip}/AppVisionService.svc/SetVariable`);
    url.searchParams.append('name', name);
    url.searchParams.append('newValue', newValue.toString());
    if (info)
        url.searchParams.append('info', info);
    url.searchParams.append('operation', operation || '');
    url.searchParams.append('date', date);
    url.searchParams.append('severity', severity || '0');
    url.searchParams.append('quality', quality || '0');
    try {
        await AppVisionRequest(url.toString(), "GET", headers);
        return {
            content: [{ type: "text", text: `request sended.` }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error setting variable: ${err}` }],
        };
    }
});
server.tool("login-session", "Login to AppVision server and create session", {
    username: z.string().describe("Username to authenticate with"),
    password: z.string().describe("Password to authenticate with"),
}, async ({ username, password }) => {
    let ip = getIp();
    let serverUrl = `http://${ip}/AppVisionService.svc/Open?clientProductName=TestClient`;
    let sessionId = null;
    try {
        const sessionIdResponse = await fetch(serverUrl);
        const sessionIdXml = await sessionIdResponse.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(sessionIdXml, 'application/xml');
        const sessionIdNode = xmlDoc.getElementsByTagName('string')[0];
        if (sessionIdNode && sessionIdNode.textContent) {
            sessionId = sessionIdNode.textContent.trim();
        }
        else {
            throw new Error('Session ID not found in the response XML.');
        }
        if (!sessionId) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve sessionId from AppVision.",
                    },
                ],
            };
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving sessionId: ${error.message}`,
                },
            ],
        };
    }
    saveSessionToFile(sessionId);
    console.log("SessionId", sessionId);
    keepAlive();
    const loginUrl = `http://${ip}/AppVisionService.svc/Login`;
    const headers = {
        'SessionID': sessionId,
        'Content-Type': 'application/xml',
    };
    let body = `
      <ArrayOfNameValue xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Common"
      xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <NameValue><Name>username</Name><Value>${username}</Value></NameValue>
        <NameValue><Name>password</Name><Value>${password}</Value></NameValue>
      </ArrayOfNameValue>
    `;
    const result = await AppVisionRequest(loginUrl, 'POST', headers, body);
    let serverUrlNotif = `http://${ip}/AppVisionService.svc/StartNotifications?send=true`;
    await AppVisionRequest(serverUrlNotif, "GET", headers);
    let serverUrlFiltre = `http://${ip}/AppVisionService.svc/AddFilterNotifications`;
    let bodyFiltre = `<string xmlns="http://schemas.microsoft.com/2003/10/Serialization/">All</string>`;
    await AppVisionRequest(serverUrlFiltre, "POST", headers, bodyFiltre);
    if (result) {
        if (result.includes('401')) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Unauthorized: Incorrect username or password.",
                    },
                ],
            };
        }
        else if (result.includes('402')) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Too many clients or users connected. Please try again later.",
                    },
                ],
            };
        }
        else if (result.includes('406')) {
            return {
                content: [
                    {
                        type: "text",
                        text: "New user detected. Please change the password.",
                    },
                ],
            };
        }
        else if (result.includes('500')) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Internal server error. Please contact support.",
                    },
                ],
            };
        }
    }
    return {
        content: [
            {
                type: "text",
                text: `Session created successfully: ${result}`,
            },
        ],
    };
});
//Holiday Request
server.tool("get-holidays", "Get all holidays from AppVision", {
    name: z.string().optional().describe("Optional, we do not need the name, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetHolidays`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve holidays.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Holidays retrieved successfully: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving holidays: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-holiday", "Get holiday details from AppVision", {
    id: z.number().describe("The ID of the holiday to fetch"),
}, async ({ id }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetHolidayById?id=${id}`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Holiday with ID ${id} not found.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Holiday details retrieved successfully: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving holiday details: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-holiday-by-date", "Get holiday by date from AppVision", {
    date: z.string().describe("The date of the holiday in the format YYYYMMDD"),
}, async ({ date }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetHolidayByDate?date=${date}`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No holiday found for the date: ${date}`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Holiday details for the date ${date}: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving holiday: ${err}`,
                },
            ],
        };
    }
});
server.tool("add-holiday", "Add a holiday to AppVision", {
    name: z.string().describe("Name of the holiday"),
    description: z.string().describe("Description of the holiday"),
    date: z.string().describe("Date of the holiday in the format YYYYMMDD"),
}, async ({ name, description, date }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/AddHoliday`;
    const holidayXml = `
      <HolidayRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Name>${name}</Name>
        <Description>${description}</Description>
        <Date>${date}</Date>
      </HolidayRow>
    `;
    try {
        const response = await AppVisionRequest(url, "POST", headers, holidayXml);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to add holiday ${name}.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Holiday ${name} added successfully with ID: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error adding holiday: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-holiday-row-count", "Get the total count of holidays from AppVision", {
    name: z.string().optional().describe("Optional, we do not need the name, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetHolidayRowCount`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve the holiday count.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Total number of holidays: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving holiday count: ${err}`,
                },
            ],
        };
    }
});
// Instruction Request
server.tool("get-instructions", "Get all instructions from AppVision", {
    name: z.string().optional().describe("Optional, we do not need the name, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetInstructions`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve instructions.",
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Instructions: ${JSON.stringify(response)}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving instructions: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-instruction-by-id", "Get a specific instruction by ID from AppVision", {
    id: z.string().describe("The ID of the instruction"),
}, async ({ id }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetInstruction?id=${id}`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No instruction found with ID: ${id}`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Instruction: ${JSON.stringify(response)}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving instruction by ID: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-instruction-by-name", "Get a specific instruction by name from AppVision", {
    name: z.string().describe("The name of the instruction"),
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetInstructionByName?name=${name}`;
    try {
        const response = await AppVisionRequest(url, "GET", headers);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No instruction found with name: ${name}`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Instruction: ${JSON.stringify(response)}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving instruction by name: ${err}`,
                },
            ],
        };
    }
});
server.tool("add-instruction", "Add a new instruction to AppVision", {
    name: z.string().describe("Name of the instruction"),
    description: z.string().describe("Description of the instruction"),
}, async ({ name, description }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/AddInstruction`;
    const xmlBody = `
      <InstructionRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Name>${name}</Name>
        <Description>${description}</Description>
      </InstructionRow>
    `;
    try {
        const response = await AppVisionRequest(url, "POST", headers, xmlBody);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to add instruction: ${name}`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Instruction added successfully with ID: ${response}`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error adding instruction: ${err}`,
                },
            ],
        };
    }
});
server.tool("delete-instruction", "Delete an instruction from AppVision", {
    id: z.string().describe("ID of the instruction to be deleted"),
}, async ({ id }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/DeleteInstruction`;
    const xmlBody = `
      <InstructionRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <Id>${id}</Id>
      </InstructionRow>
    `;
    try {
        const response = await AppVisionRequest(url, "POST", headers, xmlBody);
        if (!response) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to delete instruction with ID: ${id}`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Instruction with ID: ${id} deleted successfully.`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error deleting instruction: ${err}`,
                },
            ],
        };
    }
});
server.tool("get-instruction-row-count", "Get the count of instructions from the AppVision client", {
    name: z.string().describe("The name of the instruction"),
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetInstructionRowCount`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve instruction count."
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Instruction count: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting instruction count: ${err}`
                }
            ]
        };
    }
});
// Report Request
server.tool("get-reports", "Get all reports from the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name, if there is not name just use the tool anyway")
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetReports`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve reports."
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Reports retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting reports: ${err}`
                }
            ]
        };
    }
});
server.tool("get-report-by-name", "Get a specific report by its name from the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name, if there is not name just use the tool anyway")
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetReportByName?name=${name}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to retrieve report with name ${name}.`
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Report retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting report with name ${name}: ${err}`
                }
            ]
        };
    }
});
server.tool("get-text-report-row-count", "Get the count of text reports available in the AppVision client", {
    name: z.string().optional().describe("Optional, we do not need the name, if there is not name just use the tool anyway")
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const ip = sessionData?.ip;
    const sessionId = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetTextReportRowCount`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: `There are ${result} text reports.`
                    }
                ]
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve the text report count."
                    }
                ]
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving text report count: ${err}`
                }
            ]
        };
    }
});
// Scenario requests
server.tool("get-scenarios", "Get all scenarios from the AppVision service", {
    name: z.string().optional().describe("Optional, we do not need the name, if there is not name just use the tool anyway")
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/ScenarioManager/GetScenarios`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No scenarios found."
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Scenarios retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving scenarios: ${err}`
                }
            ]
        };
    }
});
server.tool("get-scenario", "Get a specific scenario by its ID from the AppVision service", {
    id: z.string().describe("The ID of the scenario to retrieve")
}, async ({ id }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetScenario?id=${id}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Scenario with ID ${id} does not exist.`
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Scenario retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving scenario with ID ${id}: ${err}`
                }
            ]
        };
    }
});
server.tool("get-scenario-by-name", "Get a specific scenario by its name from the AppVision service", {
    name: z.string().describe("The name of the scenario to retrieve")
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetScenarioByName?name=${name}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Scenario with name ${name} does not exist.`
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Scenario retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving scenario with name ${name}: ${err}`
                }
            ]
        };
    }
});
server.tool("get-scenario-row-count", "Get the count of scenarios available in the AppVision service", {
    name: z.string().optional().describe("Optional, we do not need the name, if there is not name just use the tool anyway")
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetScenarioRowCount`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (result !== null) {
            return {
                content: [
                    {
                        type: "text",
                        text: `There are ${result} scenarios.`
                    }
                ]
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve the scenario count."
                    }
                ]
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving scenario count: ${err}`
                }
            ]
        };
    }
});
// Options Request
server.tool("get-options", "Get a list of options starting with a specific name from the AppVision service", {
    startName: z.string().describe("The starting name to filter options")
}, async ({ startName }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetOptions?startName=${startName}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No options found starting with the provided name."
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Options retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving options: ${err}`
                }
            ]
        };
    }
});
server.tool("get-option", "Get the value of a specific option by name from the AppVision service", {
    name: z.string().describe("The name of the option to retrieve")
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetOption?name=${name}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Option with name ${name} does not exist.`
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Option value retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving option with name ${name}: ${err}`
                }
            ]
        };
    }
});
server.tool("set-option", "Set a specific option value in the AppVision service", {
    name: z.string().describe("The name of the option to set"),
    value: z.string().describe("The value to set for the option")
}, async ({ name, value }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/SetOption?name=${name}`;
    const xmlBody = `<string xmlns="http://schemas.microsoft.com/2003/10/Serialization/">${value}</string>`;
    try {
        const result = await AppVisionRequest(url, "POST", {
            'Cookie': `SessionID=${sessionId}`,
            'Content-Type': 'application/xml'
        }, xmlBody);
        if (result) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Option ${name} set successfully to value: ${value}`
                    }
                ]
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to set option ${name}.`
                    }
                ]
            };
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error setting option ${name}: ${err}`
                }
            ]
        };
    }
});
server.tool("get-license-infos", "Get all license information from the AppVision service", {
    name: z.string().optional().describe("Optional, we do not need the name, if there is not name just use the tool anyway")
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetLicenseInfos`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No license information found."
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `License information retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving license information: ${err}`
                }
            ]
        };
    }
});
server.tool("get-license-info", "Get specific license information by name from the AppVision service", {
    name: z.string().describe("The name of the license information to retrieve")
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetLicenseInfo?name=${name}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: `License info with name ${name} does not exist.`
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `License info retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving license info with name ${name}: ${err}`
                }
            ]
        };
    }
});
server.tool("get-server-state", "Get the current server state from the AppVision service", {
    name: z.string().optional().describe("Optional, we do not need the name, if there is not name just use the tool anyway")
}, async ({ name }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetServerState`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No server state information found."
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Server state retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving server state: ${err}`
                }
            ]
        };
    }
});
server.tool("get-current-alarms-with-filters", "Get current alarms from the AppVision service with specific filters", {
    filters: z.string().describe("The filters to apply to retrieve current alarms, separated by commas")
}, async ({ filters }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetCurrentAlarms?filters=${filters}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No current alarms found."
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Current alarms retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving current alarms: ${err}`
                }
            ]
        };
    }
});
server.tool("get-histo-alarms-by-page", "Get historical alarms by page with specific filters and parameters", {
    page: z.number().describe("The page number to retrieve"),
    pageSize: z.number().describe("The number of alarms per page"),
    orderByDateReceive: z.boolean().describe("Whether to order alarms by DateReceive or Date"),
    dateStart: z.string().describe("The start date for the search in invariant format"),
    filters: z.string().describe("The filters to apply to retrieve alarms, separated by commas"),
    types: z.string().describe("The alarm types as integers, separated by commas"),
    userIds: z.string().describe("The user IDs as integers, separated by commas"),
    filterInstruction: z.string().optional().describe("Optional filter for instruction"),
    filterReport: z.string().optional().describe("Optional filter for report")
}, async ({ page, pageSize, orderByDateReceive, dateStart, filters, types, userIds, filterInstruction, filterReport }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetHistoAlarmsByPage?
    page=${page}
    &pageSize=${pageSize}
    &orderByDateReceive=${orderByDateReceive}
    &dateStart=${dateStart}
    &filters=${filters}
    &types=${types}
    &userIds=${userIds}
    &filterInstruction=${filterInstruction || ''}
    &filterReport=${filterReport || ''}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No historical alarms found with the given parameters."
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Historical alarms retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving historical alarms: ${err}`
                }
            ]
        };
    }
});
server.tool("get-histo-events-by-page", "Get historical events by page with specific filters and parameters", {
    page: z.number().describe("The page number to retrieve"),
    pageSize: z.number().describe("The number of events per page"),
    orderByDateReceive: z.boolean().describe("Whether to order events by DateReceive or Date"),
    dateStart: z.string().describe("The start date for the search in invariant format"),
    filters: z.string().describe("The filters to apply to retrieve events, separated by commas"),
    types: z.string().describe("The event types as integers, separated by commas"),
    subtypes: z.string().describe("The event subtypes as integers, separated by commas")
}, async ({ page, pageSize, orderByDateReceive, dateStart, filters, types, subtypes }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetHistoEventsByPage?
    page=${page}&pageSize=${pageSize}
    &orderByDateReceive=${orderByDateReceive}
    &dateStart=${dateStart}
    &filters=${filters}
    &types=${types}
    &subtypes=${subtypes}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No historical events found with the given parameters."
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Historical events retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving historical events: ${err}`
                }
            ]
        };
    }
});
server.tool("get-histo-user-messages-by-page", "Get historical user messages by page with specific filters and parameters", {
    page: z.number().describe("The page number to retrieve"),
    pageSize: z.number().describe("The number of messages per page"),
    dateStart: z.string().describe("The start date for the search in invariant format"),
    filters: z.string().describe("The filters to apply to retrieve messages, separated by commas")
}, async ({ page, pageSize, dateStart, filters }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetHistoUserMessageByPage?
    page=${page}
    &pageSize=${pageSize}
    &dateStart=${dateStart}
    &filters=${filters}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No historical user messages found with the given parameters."
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Historical user messages retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving historical user messages: ${err}`
                }
            ]
        };
    }
});
server.tool("get-user-message-by-id", "Get a specific user message by its ID from the AppVision service", {
    umId: z.string().describe("The ID of the user message to retrieve")
}, async ({ umId }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/GetUserMessageById?umId=${umId}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: `User message with ID ${umId} not found.`
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `User message retrieved successfully: ${result}`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving user message with ID ${umId}: ${err}`
                }
            ]
        };
    }
});
server.tool("transfer-alarm-by-id", "Transfer an alarm by its ID to a specific user", {
    id: z.string().describe("The ID of the alarm to transfer"),
    transferUserId: z.string().describe("The ID of the user to transfer the alarm to")
}, async ({ id, transferUserId }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/TransferAlarmById?id=${id}&transferUserId=${transferUserId}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to transfer alarm with ID ${id}.`
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Alarm with ID ${id} transferred successfully to user ${transferUserId}.`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error transferring alarm with ID ${id}: ${err}`
                }
            ]
        };
    }
});
server.tool("transfer-alarm-by-name", "Transfer alarms by name (area, group, or variable) to a specific user", {
    opName: z.string().describe("The name of the area, group, or variable to transfer alarms from"),
    transferUserId: z.string().describe("The ID of the user to transfer the alarms to")
}, async ({ opName, transferUserId }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first."
                }
            ]
        };
    }
    const url = `http://${ip}/AppVisionService.svc/TransferAlarmByName?opName=${opName}&transferUserId=${transferUserId}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to transfer alarms for ${opName}.`
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Alarms for ${opName} transferred successfully to user ${transferUserId}.`
                }
            ]
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error transferring alarms for ${opName}: ${err}`
                }
            ]
        };
    }
});
server.tool("add-alarm-row", "Add a new alarm row in the AppVision client.", {
    areaDesc: z.string().optional().describe("Area description"),
    areaId: z.string().optional().describe("Area ID"),
    attachments: z.string().optional().describe("Attachments"),
    count: z.string().optional().describe("Alarm count"),
    customExtension: z.string().optional().describe("Custom extension"),
    customField1: z.string().optional().describe("Custom field 1"),
    customField2: z.string().optional().describe("Custom field 2"),
    customField3: z.string().optional().describe("Custom field 3"),
    customField4: z.string().optional().describe("Custom field 4"),
    customField5: z.string().optional().describe("Custom field 5"),
    customId: z.string().optional().describe("Custom ID"),
    dateAck: z.string().optional().describe("Date of acknowledgment"),
    dateEnd: z.string().optional().describe("Date of end"),
    dateReceive: z.string().optional().describe("Date received"),
    dateReport: z.string().optional().describe("Date of report"),
    dateStart: z.string().optional().describe("Date of start"),
    dateWrite: z.string().optional().describe("Date written in database"),
    description: z.string().optional().describe("Alarm description"),
    duration: z.string().optional().describe("Alarm duration"),
    groupDesc: z.string().optional().describe("Group description"),
    groupNames: z.string().optional().describe("Group names"),
    guid: z.string().optional().describe("Unique identifier for the alarm"),
    hasWorkflow: z.string().optional().describe("Whether the alarm has a workflow"),
    id: z.string().optional().describe("Alarm ID"),
    info: z.string().optional().describe("Additional information"),
    instructions: z.string().optional().describe("Alarm instructions"),
    isUserMessage: z.string().optional().describe("True if this is a user message alarm"),
    originDesc: z.string().optional().describe("Origin description when alarm is created"),
    parameters: z.string().optional().describe("Alarm parameters (metadata)"),
    parentId: z.string().optional().describe("Parent ID"),
    photo: z.string().optional().describe("Photo associated with the alarm"),
    report: z.string().optional().describe("Report associated with the alarm"),
    serverName: z.string().optional().describe("Server name (for multi-server architectures)"),
    severity: z.string().optional().describe("Severity level of the alarm"),
    siteAlarmId: z.string().optional().describe("Site alarm ID"),
    siteId: z.string().optional().describe("Site ID"),
    sourceId: z.string().optional().describe("Source ID (variable or user message ID)"),
    sourceId2: z.string().optional().describe("Source ID 2"),
    sourceId3: z.string().optional().describe("Source ID 3"),
    sourceId4: z.string().optional().describe("Source ID 4"),
    sourceName: z.string().optional().describe("Source name (e.g., $V.{variable_name})"),
    stateDesc: z.string().optional().describe("State description"),
    status: z.string().optional().describe("Status of the alarm"),
    tag: z.string().optional().describe("Reserved tag for the alarm"),
    type: z.string().optional().describe("Alarm type"),
    urls: z.string().optional().describe("URL associated with the alarm"),
    userIdAck: z.string().optional().describe("User ID who acknowledged the alarm"),
    userIdReport: z.string().optional().describe("User ID who reported the alarm"),
    video: z.string().optional().describe("Video associated with the alarm"),
    waitAcknowledge: z.string().optional().describe("True if acknowledgment is waiting"),
    waitEnd: z.string().optional().describe("True if end is waiting"),
    waitProcess: z.string().optional().describe("True if processing is waiting"),
    waitReport: z.string().optional().describe("True if report is waiting"),
}, async ({ areaDesc, areaId, attachments, count, customExtension, customField1, customField2, customField3, customField4, customField5, customId, dateAck, dateEnd, dateReceive, dateReport, dateStart, dateWrite, description, duration, groupDesc, groupNames, guid, hasWorkflow, id, info, instructions, isUserMessage, originDesc, parameters, parentId, photo, report, serverName, severity, siteAlarmId, siteId, sourceId, sourceId2, sourceId3, sourceId4, sourceName, stateDesc, status, tag, type, urls, userIdAck, userIdReport, video, waitAcknowledge, waitEnd, waitProcess, waitReport, }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const xmlBody = `
<AlarmRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data">
  <AreaDesc>${areaDesc}</AreaDesc>
  <AreaId>${areaId}</AreaId>
  <Attachments>${attachments}</Attachments>
  <Count>${count}</Count>
  <CustomExtension>${customExtension}</CustomExtension>
  <CustomField1>${customField1}</CustomField1>
  <CustomField2>${customField2}</CustomField2>
  <CustomField3>${customField3}</CustomField3>
  <CustomField4>${customField4}</CustomField4>
  <CustomField5>${customField5}</CustomField5>
  <CustomId>${customId}</CustomId>
  <DateAck>${dateAck}</DateAck>
  <DateEnd>${dateEnd}</DateEnd>
  <DateReceive>${dateReceive}</DateReceive>
  <DateReport>${dateReport}</DateReport>
  <DateStart>${dateStart}</DateStart>
  <DateWrite>${dateWrite}</DateWrite>
  <Description>${description}</Description>
  <Duration>${duration}</Duration>
  <GroupDesc>${groupDesc}</GroupDesc>
  <GroupNames>${groupNames}</GroupNames>
  <Guid>${guid}</Guid>
  <HasWorkflow>${hasWorkflow}</HasWorkflow>
  <Id>${id}</Id>
  <Info>${info}</Info>
  <Instructions>${instructions}</Instructions>
  <IsUserMessage>${isUserMessage}</IsUserMessage>
  <OriginDesc>${originDesc}</OriginDesc>
  <Parameters>${parameters}</Parameters>
  <ParentId>${parentId}</ParentId>
  <Photo>${photo}</Photo>
  <Report>${report}</Report>
  <ServerName>${serverName}</ServerName>
  <Severity>${severity}</Severity>
  <SiteAlarmId>${siteAlarmId}</SiteAlarmId>
  <SiteId>${siteId}</SiteId>
  <SourceId>${sourceId}</SourceId>
  <SourceId2>${sourceId2}</SourceId2>
  <SourceId3>${sourceId3}</SourceId3>
  <SourceId4>${sourceId4}</SourceId4>
  <SourceName>${sourceName}</SourceName>
  <StateDesc>${stateDesc}</StateDesc>
  <Status>${status}</Status>
  <Tag>${tag}</Tag>
  <Type>${type}</Type>
  <Urls>${urls}</Urls>
  <UserIdAck>${userIdAck}</UserIdAck>
  <UserIdReport>${userIdReport}</UserIdReport>
  <Video>${video}</Video>
  <WaitAcknowledge>${waitAcknowledge}</WaitAcknowledge>
  <WaitEnd>${waitEnd}</WaitEnd>
  <WaitProcess>${waitProcess}</WaitProcess>
  <WaitReport>${waitReport}</WaitReport>
</AlarmRow>
`;
    const url = `http://${ip}/AppVisionService.svc/AddAlarmRow`;
    try {
        const result = await AppVisionRequest(url, "POST", headers, xmlBody);
        if (!result) {
            return {
                content: [{ type: "text", text: `Failed to add alarm row.` }],
            };
        }
        else {
            return {
                content: [{ type: "text", text: `Alarm row added successfully.` }],
            };
        }
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error adding alarm row: ${err}` }],
        };
    }
});
server.tool("add-event-row", "Add a new event row in the AppVision client.", {
    alarmId: z.string().optional().describe("Alarm ID, nil if not provided"),
    areaDesc: z.string().optional().describe("Area description"),
    areaId: z.string().optional().describe("Area ID, nil if not provided"),
    attachments: z.string().optional().describe("Attachments, nil if not provided"),
    customExtension: z.string().optional().describe("Custom extension, nil if not provided"),
    customField1: z.string().optional().describe("Custom field 1"),
    customField2: z.string().optional().describe("Custom field 2"),
    customField3: z.string().optional().describe("Custom field 3"),
    customField4: z.string().optional().describe("Custom field 4"),
    customField5: z.string().optional().describe("Custom field 5"),
    customId: z.string().optional().describe("Event custom id"),
    date: z.string().optional().describe("Event date (ISO format)"),
    dateReceive: z.string().optional().describe("Event date receive (ISO format)"),
    dateWrite: z.string().optional().describe("Date written in database"),
    description: z.string().optional().describe("Event description"),
    groupDesc: z.string().optional().describe("Group description"),
    groupNames: z.string().optional().describe("Group names (comma separated)"),
    guid: z.string().optional().describe("Guid"),
    id: z.string().optional().describe("Event ID"),
    info: z.string().optional().describe("Additional information"),
    isUserMessage: z.string().optional().describe("True if this is a user message"),
    originDesc: z.string().optional().describe("Origin description"),
    originId: z.string().optional().describe("Origin id: 0 for scriptsup, userIdinf, protocolId"),
    parameters: z.string().optional().describe("Event parameters (metadata)"),
    photo: z.string().optional().describe("Photo"),
    quality: z.string().optional().describe("Quality (1 to 255)"),
    report: z.string().optional().describe("Event report"),
    serverName: z.string().optional().describe("Server name (e.g., BONVIEU)"),
    siteEventId: z.string().optional().describe("Site event id, nil if not provided"),
    siteId: z.string().optional().describe("Site ID, nil if not provided"),
    sourceId: z.string().optional().describe("Source id (variable)"),
    sourceId2: z.string().optional().describe("Source id 2"),
    sourceId3: z.string().optional().describe("Source id 3"),
    sourceId4: z.string().optional().describe("Source id 4"),
    sourceName: z.string().optional().describe("Source name, e.g., $V.{variable_name}"),
    stateDesc: z.string().optional().describe("State description"),
    subType: z.string().optional().describe("Event sub type"),
    type: z.string().optional().describe("Event type"),
    url: z.string().optional().describe("URL"),
    value: z.string().optional().describe("Event value"),
    valueString: z.string().optional().describe("Event value string"),
    video: z.string().optional().describe("Video"),
}, async ({ alarmId, areaDesc, areaId, attachments, customExtension, customField1, customField2, customField3, customField4, customField5, customId, date, dateReceive, dateWrite, description, groupDesc, groupNames, guid, id, info, isUserMessage, originDesc, originId, parameters, photo, quality, report, serverName, siteEventId, siteId, sourceId, sourceId2, sourceId3, sourceId4, sourceName, stateDesc, subType, type, url, value, valueString, video }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    let xmlBody = `<EventRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data">`;
    if (alarmId)
        xmlBody += `<AlarmId>${alarmId}</AlarmId>`;
    if (areaDesc)
        xmlBody += `<AreaDesc>${areaDesc}</AreaDesc>`;
    if (areaId)
        xmlBody += `<AreaId>${areaId}</AreaId>`;
    if (attachments)
        xmlBody += `<Attachments>${attachments}</Attachments>`;
    if (customExtension)
        xmlBody += `<CustomExtension>${customExtension}</CustomExtension>`;
    if (customField1)
        xmlBody += `<CustomField1>${customField1}</CustomField1>`;
    if (customField2)
        xmlBody += `<CustomField2>${customField2}</CustomField2>`;
    if (customField3)
        xmlBody += `<CustomField3>${customField3}</CustomField3>`;
    if (customField4)
        xmlBody += `<CustomField4>${customField4}</CustomField4>`;
    if (customField5)
        xmlBody += `<CustomField5>${customField5}</CustomField5>`;
    if (customId)
        xmlBody += `<CustomId>${customId}</CustomId>`;
    if (date)
        xmlBody += `<Date>${date}</Date>`;
    if (dateReceive)
        xmlBody += `<DateReceive>${dateReceive}</DateReceive>`;
    if (dateWrite)
        xmlBody += `<DateWrite>${dateWrite}</DateWrite>`;
    if (description)
        xmlBody += `<Description>${description}</Description>`;
    if (groupDesc)
        xmlBody += `<GroupDesc>${groupDesc}</GroupDesc>`;
    if (groupNames)
        xmlBody += `<GroupNames>${groupNames}</GroupNames>`;
    if (guid)
        xmlBody += `<Guid>${guid}</Guid>`;
    if (id !== undefined)
        xmlBody += `<Id>${id}</Id>`;
    if (info)
        xmlBody += `<Info>${info}</Info>`;
    if (isUserMessage !== undefined)
        xmlBody += `<IsUserMessage>${isUserMessage}</IsUserMessage>`;
    if (originDesc)
        xmlBody += `<OriginDesc>${originDesc}</OriginDesc>`;
    if (originId !== undefined)
        xmlBody += `<OriginId>${originId}</OriginId>`;
    if (parameters)
        xmlBody += `<Parameters>${parameters}</Parameters>`;
    if (photo)
        xmlBody += `<Photo>${photo}</Photo>`;
    if (quality !== undefined)
        xmlBody += `<Quality>${quality}</Quality>`;
    if (report)
        xmlBody += `<Report>${report}</Report>`;
    if (serverName)
        xmlBody += `<ServerName>${serverName}</ServerName>`;
    if (siteEventId)
        xmlBody += `<SiteEventId>${siteEventId}</SiteEventId>`;
    if (siteId)
        xmlBody += `<SiteId>${siteId}</SiteId>`;
    if (sourceId !== undefined)
        xmlBody += `<SourceId>${sourceId}</SourceId>`;
    if (sourceId2 !== undefined)
        xmlBody += `<SourceId2>${sourceId2}</SourceId2>`;
    if (sourceId3 !== undefined)
        xmlBody += `<SourceId3>${sourceId3}</SourceId3>`;
    if (sourceId4)
        xmlBody += `<SourceId4>${sourceId4}</SourceId4>`;
    if (sourceName)
        xmlBody += `<SourceName>${sourceName}</SourceName>`;
    if (stateDesc)
        xmlBody += `<StateDesc>${stateDesc}</StateDesc>`;
    if (subType !== undefined)
        xmlBody += `<SubType>${subType}</SubType>`;
    if (type !== undefined)
        xmlBody += `<Type>${type}</Type>`;
    if (url)
        xmlBody += `<Url>${url}</Url>`;
    if (value !== undefined)
        xmlBody += `<Value>${value}</Value>`;
    if (valueString)
        xmlBody += `<ValueString>${valueString}</ValueString>`;
    if (video)
        xmlBody += `<Video>${video}</Video>`;
    xmlBody += `</EventRow>`;
    const urls = `http://${ip}/AppVisionService.svc/AddEventRow`;
    try {
        const result = await AppVisionRequest(urls, "POST", headers, xmlBody);
        if (!result) {
            return {
                content: [{ type: "text", text: `Failed to add event row.` }],
            };
        }
        else {
            return {
                content: [{ type: "text", text: `Event row added successfully.` }],
            };
        }
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error adding event row: ${err}` }],
        };
    }
});
server.tool("add-user-message-row", "Add a new user message row in the AppVision client.", {
    alarmId: z.string().optional().describe("Alarm ID"),
    areaDesc: z.string().optional().describe("Area description"),
    areaId: z.string().optional().describe("Area ID"),
    attachments: z.string().optional().describe("Attachments"),
    category: z.string().optional().describe("UserMessage category"),
    comment: z.string().optional().describe("UserMessage content comment"),
    contentCategory: z.string().optional().describe("UserMessage content category (NameValue[] category properties)"),
    contentReferences: z.string().optional().describe("UserMessage content references (variables, groups, etc.)"),
    customExtension: z.string().optional().describe("Custom extension"),
    dateClose: z.string().optional().describe("UserMessage closing date (ISO format)"),
    dateCreate: z.string().optional().describe("UserMessage creation date (ISO format)"),
    dateWrite: z.string().optional().describe("Date written in database"),
    description: z.string().optional().describe("UserMessage description"),
    extension: z.string().optional().describe("Reserved"),
    groupDesc: z.string().optional().describe("Group descriptions (comma separated)"),
    groupNames: z.string().optional().describe("Group names (comma separator)"),
    guid: z.string().optional().describe("Guid"),
    id: z.number().optional().describe("UserMessage ID"),
    isCompleted: z.boolean().optional().describe("Is completed"),
    isIncident: z.boolean().optional().describe("UserMessage incident"),
    isInProgress: z.boolean().optional().describe("Is in progress"),
    photo: z.string().optional().describe("Photo"),
    references: z.string().optional().describe("User message references"),
    serverName: z.string().optional().describe("Server name (e.g., BONVIEU)"),
    severity: z.number().optional().describe("Alarm severity"),
    status: z.number().optional().describe("UserMessage status: 1:InProgress, 5:WaitAck, 10:Completed"),
    statusToString: z.string().optional().describe("Status to string"),
    to: z.string().optional().describe("UserMessage recipient: null, @All, Profile_Name, User_Name, MachineName"),
    userIdClose: z.number().optional().describe("User ID who closed this message"),
    userIdCreate: z.number().optional().describe("User ID who created this message"),
    userNameClose: z.string().optional().describe("User name who closed this message"),
    userNameCreate: z.string().optional().describe("User name who created this message"),
    video: z.string().optional().describe("Video")
}, async ({ alarmId, areaDesc, areaId, attachments, category, comment, contentCategory, contentReferences, customExtension, dateClose, dateCreate, dateWrite, description, extension, groupDesc, groupNames, guid, id, isCompleted, isIncident, isInProgress, photo, references, serverName, severity, status, statusToString, to, userIdClose, userIdCreate, userNameClose, userNameCreate, video }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    // Construct XML dynamically, only including properties that are provided
    let xmlBody = `<UserMessageRow xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Data">`;
    // Add only the properties that are provided
    if (alarmId)
        xmlBody += `<AlarmId>${alarmId}</AlarmId>`;
    if (areaDesc)
        xmlBody += `<AreaDesc>${areaDesc}</AreaDesc>`;
    if (areaId)
        xmlBody += `<AreaId>${areaId}</AreaId>`;
    if (attachments)
        xmlBody += `<Attachments>${attachments}</Attachments>`;
    if (category)
        xmlBody += `<Category>${category}</Category>`;
    if (comment)
        xmlBody += `<Comment>${comment}</Comment>`;
    if (contentCategory)
        xmlBody += `<ContentCategory>${contentCategory}</ContentCategory>`;
    if (contentReferences)
        xmlBody += `<ContentReferences>${contentReferences}</ContentReferences>`;
    if (customExtension)
        xmlBody += `<CustomExtension>${customExtension}</CustomExtension>`;
    if (dateClose)
        xmlBody += `<DateClose>${dateClose}</DateClose>`;
    if (dateCreate)
        xmlBody += `<DateCreate>${dateCreate}</DateCreate>`;
    if (dateWrite)
        xmlBody += `<DateWrite>${dateWrite}</DateWrite>`;
    if (description)
        xmlBody += `<Description>${description}</Description>`;
    if (extension)
        xmlBody += `<Extension>${extension}</Extension>`;
    if (groupDesc)
        xmlBody += `<GroupDesc>${groupDesc}</GroupDesc>`;
    if (groupNames)
        xmlBody += `<GroupNames>${groupNames}</GroupNames>`;
    if (guid)
        xmlBody += `<Guid>${guid}</Guid>`;
    if (id !== undefined)
        xmlBody += `<Id>${id}</Id>`;
    if (isCompleted !== undefined)
        xmlBody += `<IsCompleted>${isCompleted}</IsCompleted>`;
    if (isIncident !== undefined)
        xmlBody += `<IsIncident>${isIncident}</IsIncident>`;
    if (isInProgress !== undefined)
        xmlBody += `<IsInProgress>${isInProgress}</IsInProgress>`;
    if (photo)
        xmlBody += `<Photo>${photo}</Photo>`;
    if (references)
        xmlBody += `<References>${references}</References>`;
    if (serverName)
        xmlBody += `<ServerName>${serverName}</ServerName>`;
    if (severity !== undefined)
        xmlBody += `<Severity>${severity}</Severity>`;
    if (status !== undefined)
        xmlBody += `<Status>${status}</Status>`;
    if (statusToString)
        xmlBody += `<StatusToString>${statusToString}</StatusToString>`;
    if (to)
        xmlBody += `<To>${to}</To>`;
    if (userIdClose !== undefined)
        xmlBody += `<UserIdClose>${userIdClose}</UserIdClose>`;
    if (userIdCreate !== undefined)
        xmlBody += `<UserIdCreate>${userIdCreate}</UserIdCreate>`;
    if (userNameClose)
        xmlBody += `<UserNameClose>${userNameClose}</UserNameClose>`;
    if (userNameCreate)
        xmlBody += `<UserNameCreate>${userNameCreate}</UserNameCreate>`;
    if (video)
        xmlBody += `<Video>${video}</Video>`;
    xmlBody += `</UserMessageRow>`;
    const url = `http://${ip}/AppVisionService.svc/AddUserMessageRow`;
    try {
        const result = await AppVisionRequest(url, "POST", headers, xmlBody);
        if (!result) {
            return {
                content: [{ type: "text", text: `Failed to add user message row.` }],
            };
        }
        else {
            return {
                content: [{ type: "text", text: `User message row added successfully.` }],
            };
        }
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error adding user message row: ${err}` }],
        };
    }
});
server.tool("start-supervision", "Start the supervision process in AppVision.", {
    name: z.string().optional().describe("Optional, we do not need the name, if there is not name just use the tool anyway")
}, async (name) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/StartSupervision`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [{ type: "text", text: `Failed to start supervision.` }],
            };
        }
        else {
            return {
                content: [{ type: "text", text: `Supervision started successfully.` }],
            };
        }
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error starting supervision: ${err}` }],
        };
    }
});
server.tool("stop-supervision", "Stop the supervision process in AppVision.", {
    restart: z.string().optional().describe("Whether to restart supervision (true/false)"),
}, async ({ restart }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/StopSupervision?restart=${restart}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [{ type: "text", text: `Failed to stop supervision.` }],
            };
        }
        else {
            return {
                content: [{ type: "text", text: `Supervision stopped successfully.` }],
            };
        }
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error stopping supervision: ${err}` }],
        };
    }
});
server.tool("lock-variable", "Lock or unlock a variable in AppVision.", {
    name: z.string().describe("The variable name to lock or unlock"),
    isLocked: z.boolean().describe("True to lock the variable, false to unlock"),
    val: z.string().describe("Variable state value (for locking only)"),
    tempo: z.string().describe("Temporization for locking in milliseconds, 0 for no temporization"),
}, async ({ name, isLocked, val, tempo }) => {
    const sessionData = await getSessionAndHeaders();
    const sessionId = sessionData?.sessionId;
    const ip = sessionData?.ip;
    const headers = sessionData?.headers;
    if (!sessionId) {
        return {
            content: [
                {
                    type: "text",
                    text: "No active session. Please log in first.",
                },
            ],
        };
    }
    const url = `http://${ip}/AppVisionService.svc/LockVariable?name=${name}&isLocked=${isLocked}&val=${val || ""}&tempo=${tempo || 0}`;
    try {
        const result = await AppVisionRequest(url, "GET", headers);
        if (!result) {
            return {
                content: [{ type: "text", text: `Failed to lock or unlock the variable.` }],
            };
        }
        else {
            return {
                content: [{ type: "text", text: `Variable ${name} locked/unlocked successfully.` }],
            };
        }
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error locking or unlocking the variable: ${err}` }],
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("AppVision MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
