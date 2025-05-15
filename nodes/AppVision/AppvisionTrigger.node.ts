import type {
    ITriggerFunctions,
    INodeType,
    INodeTypeDescription,
    ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { XMLParser } from 'fast-xml-parser';
import * as path from 'path';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';


export class AppvisionTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Appvision Trigger',
        name: 'appvisionTrigger',
        icon: 'file:appvision.png',
        group: ['trigger'],
        version: 1,
        description: 'Receive real-time notifications from AppVision',
        defaults: {
            name: 'AppVision Trigger',
            color: '#1F8FFF',
        },
        inputs: [],
        outputs: [
            NodeConnectionType.Main,
            NodeConnectionType.Main,
            NodeConnectionType.Main,
            NodeConnectionType.Main,
            NodeConnectionType.Main,
            NodeConnectionType.Main,
            NodeConnectionType.Main,
            NodeConnectionType.Main,
        ],
        outputNames: [
            'EventRow',
            'VariableState',
            'AlarmInfo',
            'GroupState',
            'AreaState',
            'ProtocolState',
            'Connexion/Disconnexion',
            'ServerState'
        ],

        credentials: [
            {
              name: 'appVisionCredentials',
              required: true,
            },
          ],
          properties: [
            {
              displayName: 'Polling Interval (seconds)',
              name: 'pollingInterval',
              type: 'number',
              default: 1,
              description: 'Intervalle de récupération des notifications',
            },
          ],
    };

    async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
        const credentials = await this.getCredentials('appVisionCredentials');
        const username = credentials?.username;
        const password = credentials?.password;
        const ip = credentials?.ip;

        const pollingInterval = (this.getNodeParameter('pollingInterval', 0) as number) * 1000;
        const parser = new XMLParser({ ignoreAttributes: false });

        let outputArray: Array<any[]> = [[], [], [], [], [], [], []];
        console.log("Adresse utilisée pour AppVision :", ip);


        let sessionId: string | null = null;
        let isActive = true;
        let isFirstTime = true;
        let isConnecting = false;

        const waitForServer = async () => {
            while (isActive) {
                if (isConnecting) {
                    console.log("Une reconnexion est deja en cours");
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    continue;
                }

                isConnecting = true;
                try {
                    console.log("Verification de l'etat du serveur");
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: `http://${ip}/AppVisionService.svc/Open?clientProductName=TestClient`,
                    });
                    console.log("Adresse utilisée pour AppVision 2 :", ip);
                    if (response) {
                        console.log("OUI Serveur en ligne");
                        isConnecting = false;
                        return response.replace(/<[^>]+>/g, '');
                    }
                } catch (error) {
                    console.error("Serveur hors ligne Attente avant une tentative ");
                }

                isConnecting = false;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        };

        const connectToServer = async () => {
            sessionId = await waitForServer();
            try {
                const isDocker = () => existsSync('/.dockerenv');

                const sessionFilePath = isDocker()
                    ? '/usr/local/lib/node_modules/n8n-nodes-appvision/dist/nodes/AppVision/session/sessionId.json'
                    : path.join(__dirname, 'session', 'sessionId.json');

                const content = JSON.stringify([{ sessionId , ip}], null, 2);

                await fs.writeFile(sessionFilePath, content, 'utf-8');
                console.log("c'est bon c'est ecritg", sessionFilePath);
            } catch (err: any) {
                console.error("Err :", err.message);
            }
            const loginUrl = `http://${ip}/AppVisionService.svc/Login`;
            const headers = { SessionID: sessionId, 'Content-Type': 'application/xml' };
            const body = `
            <ArrayOfNameValue xmlns="http://schemas.datacontract.org/2004/07/Prysm.AppVision.Common"
            xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
            <NameValue><Name>username</Name><Value>${username}</Value></NameValue>
            <NameValue><Name>password</Name><Value>${password}</Value></NameValue>
            </ArrayOfNameValue>`;

            await this.helpers.request({ method: 'POST', url: loginUrl, headers, body });
            console.log("connexion réussie !!!!!!!!!");
            outputArray = [[], [], [], [], [], [], [], []];
            outputArray[6].push({
                message: "Connection successful",
            });
            isFirstTime = true;
        };

        const enableNotifications = async () => {
            await this.helpers.request({
                method: 'GET',
                url: `http://${ip}/AppVisionService.svc/StartNotifications?send=true`,
                headers: { SessionID: sessionId },
            });

            await this.helpers.request({
                method: 'POST',
                url: `http://${ip}/AppVisionService.svc/AddFilterNotifications`,
                headers: { SessionID: sessionId, 'Content-Type': 'application/xml' },
                body: `<string xmlns="http://schemas.microsoft.com/2003/10/Serialization/">All</string>`
            });
        };

        const monitorNotifications = async () => {
            while (isActive) {
                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: `http://${ip}/AppVisionService.svc/GetNotifications?count=10`,
                        headers: { SessionID: sessionId, 'Content-Type': 'application/xml' },
                    });

                    if (response && response.trim() !== '') {

                        try {
                            const parsedData = parser.parse(response);
                            let notifications = parsedData?.ArrayOfNotification?.Notification;
                            const notificationArray = Array.isArray(notifications) ? notifications : (notifications ? [notifications] : []);

                            if (notificationArray.length > 0) {
                                const filteredNotifications = notificationArray.filter((notification: any) => {
                                    const type = notification.Data?.["@_i:type"] || notification.Data?.type || "Unknown";
                                    return [
                                        "EventRow",
                                        "VariableState",
                                        "AlarmInfo",
                                        "GroupState",
                                        "AreaState",
                                        "ProtocolState",
                                        "ServerState",
                                    ].includes(type);
                                });
                            
                                if (filteredNotifications.length > 0) {
                                    if (isFirstTime) {
                                        // Si c'est la première exécution on garde la branche Connexion/Deconnexion
                                        // et vide le reste
                                        for (let i = 0; i < outputArray.length; i++) {
                                            if (i !== 6) outputArray[i] = [];
                                        }
                                        isFirstTime = false;
                                    } else {
                                        outputArray = [[], [], [], [], [], [], [], []];
                                    }
                            
                                    filteredNotifications.forEach((notification: any) => {
                                        const type = notification.Data?.["@_i:type"] || notification.Data?.type || "Unknown";
                                        let formattedNotification: any = { type };
                                        let outputIndex = -1;
                            
                                        if (type === "EventRow") {
                                            formattedNotification = {
                                                notification: {
                                                    type,
                                                    data: notification.Data || "N/A",
                                                },
                                            };
                                            outputIndex = 0;
                                        } else if (type === "VariableState") {
                                            formattedNotification = {
                                                notification: {
                                                    type,
                                                    data: notification.Data || "N/A",
                                                },
                                            };
                                            outputIndex = 1;
                                        } else if (type === "AlarmInfo") {
                                            formattedNotification = {
                                                notification: {
                                                    type,
                                                    Alarm: notification.Data?.Alarm || "N/A",
                                                    Description: notification.Data?.Description || "N/A",
                                                },
                                            };
                                            outputIndex = 2;
                                        } else if (type === "GroupState") {
                                            formattedNotification = {
                                                notification: {
                                                    type,
                                                    data: notification.Data || "N/A",
                                                },
                                            };
                                            outputIndex = 3;
                                        } else if (type === "AreaState") {
                                            formattedNotification = {
                                                notification: {
                                                    type,
                                                    data: notification.Data || "N/A",
                                                },
                                            };
                                            outputIndex = 4;
                                        } else if (type === "ProtocolState") {
                                            formattedNotification = {
                                                notification: {
                                                    type,
                                                    data: notification.Data || "N/A",
                                                },
                                            };
                                            outputIndex = 5;
                                        } else if (type === "ServerState") {
                                            formattedNotification = {
                                                notification: {
                                                    type,
                                                    data: notification.Data || "N/A",
                                                },
                                            };
                                            outputIndex = 7;
                                        }
                            
                                        if (outputIndex !== -1) {
                                            outputArray[outputIndex].push(formattedNotification);
                                        }
                                    });
                            
                                    this.emit(outputArray.map(output => output.length > 0 ? this.helpers.returnJsonArray(output) : []));
                                }
                            }
                            
                        } catch (parseError) {
                            console.error("Erreur de XML :", parseError.message);
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, pollingInterval));
                } catch (error) {
                    outputArray = [[], [], [], [], [], [], [], []];
                    outputArray[6].push({
                        message: "Deconnection detected",

                    });
                    this.emit(outputArray.map(output => output.length > 0 ? this.helpers.returnJsonArray(output) : []));
                    console.error("Perte de connexion avec AppVision. reconnexion...");
                    await connectToServer();
                    await enableNotifications();
                }
            }
        };

        // fonction pour nettoyer qd désactivation
        const cleanup = async () => {
            if (sessionId) {
                await this.helpers.request({
                    method: 'GET',
                    url: `http://${ip}/AppVisionService.svc/Close`,
                    headers: { SessionID: sessionId },
                });
                console.log("Connexion fermer");
                outputArray = [[], [], [], [], [], [], [], []];
                outputArray[6].push({
                    message: "Deconnection detected, caused by desacitvation",
                    sessionId: sessionId
                });
                this.emit(outputArray.map(output => output.length > 0 ? this.helpers.returnJsonArray(output) : []));
            }
            isActive = false;
        };

        // start worklfow
        (async () => {
            await connectToServer();
            await enableNotifications();
            await monitorNotifications();
        })();

        return {
            closeFunction: cleanup, // Nettoi Tout
        };
    }
}   