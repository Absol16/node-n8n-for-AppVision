import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { XMLParser } from 'fast-xml-parser';
import { NodeConnectionType } from 'n8n-workflow';
import fs from 'fs/promises';
import path from 'path';

export class AppvisionService implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Appvision Node',
        name: 'AppvisionNode',
        icon: 'file:appvision.png',
        group: ['transform'],
        version: 1,
        description: 'A web service for AppVision',
        defaults: {
            name: 'AppVision',
            color: '#',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Alarm',
                        value: 'alarm',
                        description: 'Opérations liées aux alarmes',
                    },
                    {
                        name: 'Variable',
                        value: 'variable',
                        description: 'Opérations liées aux variables',
                    },
                    {
                        name: 'Super Vision',
                        value: 'superVision',
                    },
                    {
                        name: 'Other Command',
                        value: 'other',
                    },
                ],
                default: 'alarm',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['alarm'],
                    },
                },
                options: [
                    {
                        name: 'Get Current Alarms',
                        value: 'getCurrentAlarms',
                        description: 'Retrieve the current alarms',
                    },
                    {
                        name: 'Remove All Alarms',
                        value: 'removeAllAlarms',
                        description: 'Remove all alarms',
                    },
                    {
                        name: 'Update Alarm',
                        value: 'updateAlarm',
                        description: 'Update an existing alarm',
                    },
                    {
                        name: 'Get Alarm Event',
                        value: 'getAlarmEvent',
                        description: 'Retrieve the current alarm events',
                    },
                    {
                        name: 'Acknowledge Alarm By Id',
                        value: 'acknowledgeAlarmById',
                        description: 'Acknowledge an alarm by its ID',
                    },
                    {
                        name: 'Cancel Alarm',
                        value: 'cancelAlarm',
                        description: 'Cancel an existing alarm',
                    },
                    {
                        name: 'Resume Alarm By Id',
                        value: 'resumeAlarmById',
                        description: 'Resume an alarm by its ID',
                    },
                ],
                default: 'getCurrentAlarms',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['variable'],
                    },
                },
                options: [
                    {
                        name: 'Set Variable',
                        value: 'setVariable',
                        description: 'Update a variable',
                    },
                    {
                        name: 'Set Variable With Tempo',
                        value: 'setVariableWithTempo',
                        description: 'Update a variable with a delay',
                    },
                    {
                        name: 'Set Variable With Pulse',
                        value: 'setVariableWithPulse',
                        description: 'Update a variable with a pulse delay',
                    },
                    {
                        name: 'Lock Variable',
                        value: 'lockVariable',
                        description: 'Lock or unlock a variable',
                    },
                    {
                        name: 'Mask Alarm',
                        value: 'maskAlarm',
                        description: 'Mask or unmask an alarm',
                    }

                ],
                default: 'setVariable',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['superVision'],
                    },
                },
                options: [
                    {
                        name: 'Start Supervision',
                        value: 'start',
                        description: 'Activate server supervision'
                    },
                    {
                        name: 'Stop Supervision',
                        value: 'stop',
                        description: 'Deactivate server supervision (with restart option)'
                    }
                ],
                default: 'start',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['other'],
                    },
                },
                options: [
                    {
                        name: 'Send Command To Client',
                        value: 'sendCommandToClient',
                        description: 'Send a command to the AppVision client',
                    },
                    {
                        name: 'Add Modification',
                        value: 'addModification',
                        description: 'Add a modification in AppVision',
                    },
                    {
                        name: 'Get Users Connected',
                        value: 'getUsersConnected',
                        description: 'Retrieve the list of connected users',
                    },
                    {
                        name: 'Get Current User',
                        value: 'getCurrentUser',
                        description: 'Retrieve the currently connected user',
                    },
                    {
                        name: 'Get Protocols Connected',
                        value: 'getProtocolsConnected',
                        description: 'Retrieve the list of connected protocols',
                    },
                    {
                        name: 'Get Current Protocol',
                        value: 'getCurrentProtocol',
                        description: 'Retrieve the currently connected protocol',
                    },
                    {
                        name: 'Send Download To Protocol',
                        value: 'sendDownloadToProtocol',
                        description: 'Send a data download request to the protocol',
                    },
                ],
                default: 'start',
            },
            {
                displayName: 'IP',
                name: 'ip',
                type: 'string',
                default: '',
                required: true,
                description: 'L\'adresse IP du service AppVision',
            },
            {
                displayName: 'Lock Status',
                name: 'isLocked',
                type: 'boolean',
                default: true,
                required: true,
                displayOptions: {
                    show: {
                        operation: ['lockVariable'],
                    },
                },
                description: 'Verrouiller (true) ou déverrouiller (false) la variable',
            },
            {
                displayName: 'Alarm Id',
                name: 'alarmId',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['getAlarmEvent', 'acknowledgeAlarmById', 'cancelAlarm', 'resumeAlarmById'],
                    },
                },
                required: true,
                description: 'Le nom de la variable à mettre à jour',
            },
            {
                displayName: 'Comment',
                name: 'comment',
                type: 'string',
                required: true,
                default: '',
                description: 'Commentaire expliquant l\'annulation de l\'alarme',
                displayOptions: {
                    show: {
                        operation: ['cancelAlarm'],
                    },
                },
            },
            {
                displayName: 'Variable Name',
                name: 'name',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['setVariable', 'setVariableWithTempo', 'lockVariable', 'setVariableWithPulse'],
                    },
                },
                required: true,
                description: 'Le nom de la variable à mettre à jour',
            },
            {
                displayName: 'New Value',
                name: 'newValue',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['setVariable', 'setVariableWithTempo'],
                    },
                },
                required: true,
                description: 'La nouvelle valeur de la variable',
            },
            {
                displayName: 'Info',
                name: 'info',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['setVariable', 'addModification'],
                    },
                },
                description: 'Informations complémentaires (optionnel)',
            },
            {
                displayName: 'Operation Type',
                name: 'operationType',
                type: 'options',
                options: [
                    {
                        name: 'Normal',
                        value: '',
                        description: 'Mise à jour normale',
                    },
                    {
                        name: '@INIT',
                        value: '@INIT',
                        description: 'Mise à jour lors de l\'initialisation',
                    },
                    {
                        name: '@CHANGEONLY',
                        value: '@CHANGEONLY',
                        description: 'Mise à jour uniquement si la valeur change',
                    },
                ],
                default: '',
                displayOptions: {
                    show: {
                        operation: ['setVariable'],
                    },
                },
                description: 'Le type d\’opération à effectuer',
            },
            {
                displayName: 'Severity',
                name: 'severity',
                type: 'number',
                default: 0,
                displayOptions: {
                    show: {
                        operation: ['setVariable'],
                    },
                },
                description: 'La sévérité de l\’alarme (0: défaut, -1: aucune alarme, 1-100: sévérité spécifique)',
            },
            {
                displayName: 'Quality',
                name: 'quality',
                type: 'number',
                default: 0,
                displayOptions: {
                    show: {
                        operation: ['setVariable'],
                    },
                },
                description: 'La qualité de l\’état (0: défaut, 1-255: qualité spécifique)',
            },
            {
                displayName: 'Tempo (ms)',
                name: 'tempo',
                type: 'number',
                default: 0,
                displayOptions: {
                    show: {
                        operation: ['setVariableWithTempo', 'setVariableWithPulse', 'lockVariable', 'maskAlarm'],
                    },
                },
                description: 'temporisation en millisecondes, la modification de la variable ne prend effet qu\’après X millisecondes.',
            },
            {
                displayName: 'Alarm Data',
                name: 'alarmData',
                type: 'json',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['updateAlarm'],
                    },
                },
                required: true,
                description: 'Les données de l\'alarme à mettre à jour (en JSON)',
            },
            {
                displayName: 'Value ',
                name: 'val',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        operation: ['lockVariable'],
                    },
                },
                description: 'La valeur de la variable lors du verrouillage',
            },
            {
                displayName: 'Start Value',
                name: 'valStart',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['setVariableWithPulse'],
                    },
                },
                description: 'La valeur de la variable au début de la temporisation',
            },
            {
                displayName: 'End Value',
                name: 'valEnd',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['setVariableWithPulse'],
                    },
                },
                description: 'La valeur de la variable à la fin de la temporisation',
            },
            {
                displayName: 'Restart',
                name: 'restart',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['stop'],
                    },
                },
                description: 'Optionnel : redémarrer la supervision après l\'arrêt',
            },

            {
                displayName: 'Client Name',
                name: 'clientName',
                type: 'string',
                required: true,
                default: '',
                description: 'Nom du client ou nom du protocole du client (commence par $P pour les protocoles)',
                displayOptions: {
                    show: {
                        operation: ['sendCommandToClient'],
                    },
                },
            },
            {
                displayName: 'Command',
                name: 'command',
                type: 'string',
                required: true,
                default: '',
                description: 'La commande à envoyer (ex: @Load, @Open, etc.)',
                displayOptions: {
                    show: {
                        operation: ['sendCommandToClient'],
                    },
                },
            },
            {
                displayName: 'Parameters',
                name: 'parameters',
                type: 'string',
                required: true,
                default: '',
                description: 'Les paramètres de la commande (séparés par une virgule)',
                displayOptions: {
                    show: {
                        operation: ['sendCommandToClient'],
                    },
                },
            },
            {
                displayName: 'Table',
                name: 'table',
                type: 'string',
                required: true,
                default: '',
                description: 'Le nom de la table où la modification doit être ajoutée',
                displayOptions: {
                    show: {
                        operation: ['addModification'],
                    },
                },
            },
            {
                displayName: 'Type',
                name: 'type',
                type: 'number',
                required: true,
                default: 0,
                description: 'Le type de modification (entier)',
                displayOptions: {
                    show: {
                        operation: ['addModification'],
                    },
                },
            },
            {
                displayName: 'Source ID 1',
                name: 'sourceId',
                type: 'number',
                required: true,
                default: 0,
                description: 'ID source de la modification',
                displayOptions: {
                    show: {
                        operation: ['addModification'],
                    },
                },
            },
            {
                displayName: 'Source ID 2',
                name: 'sourceId2',
                type: 'number',
                default: 0,
                description: 'Deuxième ID source (optionnel)',
                displayOptions: {
                    show: {
                        operation: ['addModification'],
                    },
                },
            },
            {
                displayName: 'Source ID 3',
                name: 'sourceId3',
                type: 'number',
                default: 0,
                description: 'Troisième ID source (optionnel)',
                displayOptions: {
                    show: {
                        operation: ['addModification'],
                    },
                },
            },
            {
                displayName: 'User ID',
                name: 'userId',
                type: 'number',
                required: true,
                default: 0,
                description: 'ID utilisateur ayant effectué la modification',
                displayOptions: {
                    show: {
                        operation: ['addModification'],
                    },
                },
            },
            {
                displayName: 'Description',
                name: 'description',
                type: 'string',
                required: true,
                default: '',
                description: 'Description de la modification',
                displayOptions: {
                    show: {
                        operation: ['addModification'],
                    },
                },
            },
            {
                displayName: 'Variable Names',
                name: 'varNames',
                type: 'string',
                required: true,
                default: '',
                description: 'Les noms des variables séparés par des virgules (ex: variable1,variable2)',
                displayOptions: {
                    show: {
                        operation: ['sendDownloadToProtocol'],
                    },
                },
            },
            {
                displayName: 'Parameter',
                name: 'parameter',
                type: 'string',
                required: true,
                default: '',
                description: 'Informations à télécharger (People, Rights, Timetables, Holidays, Modifications)',
                displayOptions: {
                    show: {
                        operation: ['sendDownloadToProtocol'],
                    },
                },
            },
            {
                displayName: 'Operation Name (opName)',
                name: 'opName',
                type: 'string',
                required: true,
                default: '',
                description: 'Nom de l\'opération à masquer (ex: $V.variableName, $A.areaName, $G.groupName)',
                displayOptions: {
                    show: {
                        operation: ['maskAlarm'],
                    },
                },
            },
            {
                displayName: 'Is Masked',
                name: 'isMasked',
                type: 'boolean',
                required: true,
                default: true,
                description: 'Masquer (true) ou démasquer (false) l\'alarme',
                displayOptions: {
                    show: {
                        operation: ['maskAlarm'],
                    },
                },
            },
            {
                displayName: 'Transfer User ID',
                name: 'transferUserId',
                type: 'number',
                required: true,
                default: 0,
                description: 'L\'ID de l\'utilisateur qui reprend l\'alarme, ou 0 pour l\'utilisateur actuel',
                displayOptions: {
                    show: {
                        operation: ['resumeAlarmById'],
                    },
                },
            },

        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const credentials = await this.getCredentials('appVisionCredentials');
        const ip = credentials?.ip;
        const returnData: INodeExecutionData[] = [];
        const operation = this.getNodeParameter('operation', 0) as string;
        const parser = new XMLParser({ ignoreAttributes: false });

        try {
            const isDocker = () => require('fs').existsSync('/.dockerenv');

            const sessionFilePath = isDocker()
                ? '/usr/local/lib/node_modules/n8n-nodes-appvision/dist/nodes/AppVision/session/sessionId.json'
                : path.join(__dirname, 'session', 'sessionId.json');

            console.log("Chemin :", sessionFilePath);

            let sessionId: string | null = null;
            try {
                const fileContent = await fs.readFile(sessionFilePath, 'utf-8');
                const jsonData = JSON.parse(fileContent);

                if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].sessionId) {
                    sessionId = jsonData[0].sessionId;
                    console.log(" Utilisation de la SessionID :", sessionId);

                }
            } catch (err) {
                returnData.push({ json: { error: 'Impossible de lire le fichier sessionId.json', details: err.message } });
                return [returnData];
            }

            if (!sessionId) {
                returnData.push({ json: { error: 'Aucun sessionId trouvé, veuillez vérifier votre fichier sessionId.json' } });
                return [returnData];
            }

            console.log(" Utilisation du chemin :", sessionFilePath);
            console.log(" Utilisation de la SessionID :", sessionId);

            if (operation === 'setVariable') {
                const name = this.getNodeParameter('name', 0) as string;
                const newValue = this.getNodeParameter('newValue', 0) as string;
                const info = this.getNodeParameter('info', 0) as string;
                const operationType = this.getNodeParameter('operationType', 0) as string;

                const now = new Date();
                const date = now.toISOString();

                const severity = this.getNodeParameter('severity', 0) as string;
                const quality = this.getNodeParameter('quality', 0) as string;

                const url = new URL(`http://${ip}/AppVisionService.svc/SetVariable`);
                url.searchParams.append('name', name);
                url.searchParams.append('newValue', newValue.toString());
                if (info) url.searchParams.append('info', info);
                url.searchParams.append('operation', operationType);
                url.searchParams.append('date', date);
                url.searchParams.append('severity', severity);
                url.searchParams.append('quality', quality);

                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });
                    returnData.push({ json: { success: true, response: response } });
                } catch (error) {
                    if (error.statusCode === 400) {
                        returnData.push({ json: { success: false, error: 'La variable n\'existe pas.' } });
                    } else {
                        throw error;
                    }
                }
            }

            if (operation == 'setVariableWithTempo') {
                const name = this.getNodeParameter('name', 0) as string;
                const tempo = this.getNodeParameter('tempo', 0) as string;
                const newValue = this.getNodeParameter('newValue', 0) as string;

                const url = new URL(`http://${ip}/AppVisionService.svc/SetVariableWithTempo`);
                url.searchParams.append('name', name);
                url.searchParams.append('tempo', tempo);
                url.searchParams.append('newValue', newValue);
                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });
                    returnData.push({ json: { success: true, response: response } });
                } catch (error) {
                    if (error.statusCode === 400) {
                        returnData.push({ json: { success: false, error: 'La variable n\'existe pas.' } });
                    } else {
                        throw error;
                    }
                }

            }

            if (operation === 'setVariableWithPulse') {
                const name = this.getNodeParameter('name', 0) as string;
                const tempo = this.getNodeParameter('tempo', 0) as number;
                const valStart = this.getNodeParameter('valStart', 0) as string;
                const valEnd = this.getNodeParameter('valEnd', 0) as string;

                const url = new URL(`http://${ip}/AppVisionService.svc/SetVariableWithPulse`);
                url.searchParams.append('name', name);
                url.searchParams.append('tempo', tempo.toString());
                url.searchParams.append('valStart', valStart);
                url.searchParams.append('valEnd', valEnd);

                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });
                    returnData.push({ json: { success: true, response: response } });
                } catch (error) {
                    if (error.statusCode === 400) {
                        returnData.push({ json: { success: false, error: 'La variable n\'existe pas.' } });
                    } else {
                        throw error;
                    }
                }
            }

            if (operation === 'lockVariable') {
                const name = this.getNodeParameter('name', 0) as string;
                const isLocked = this.getNodeParameter('isLocked', 0) as boolean;
                const val = this.getNodeParameter('val', 0) as string;
                const tempo = this.getNodeParameter('tempo', 0) as number;

                const url = new URL(`http://${ip}/AppVisionService.svc/LockVariable`);
                url.searchParams.append('name', name);
                url.searchParams.append('isLocked', isLocked.toString());
                url.searchParams.append('val', val);
                url.searchParams.append('tempo', tempo.toString());

                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });
                    returnData.push({ json: { success: true, response: response } });
                } catch (error) {
                    if (error.statusCode === 400) {
                        returnData.push({ json: { success: false, error: 'La variable n\'existe pas.' } });
                    } else {
                        throw error;
                    }
                }
            }

            if (operation === 'getCurrentAlarms') {

                const url = new URL(`http://${ip}/AppVisionService.svc/GetCurrentAlarms`);
                const response = await this.helpers.request({
                    method: 'GET',
                    url: url.toString(),
                    headers: { SessionID: sessionId },
                });
                const parsedData = parser.parse(response);
                const alarmsData = parsedData.ArrayOfAlarmRow.AlarmRow;

                if (!alarmsData || (Array.isArray(alarmsData) && alarmsData.length === 0)) {
                    returnData.push({ json: { message: "Il n'y a pas d'alarme" } });
                } else returnData.push({ json: { result: this.helpers.returnJsonArray(alarmsData) } });

            }
            if (operation === 'getAlarmEvent') {

                const alarmId = this.getNodeParameter('alarmId', 0) as string;
                const url = new URL(`http://${ip}/AppVisionService.svc/GetAlarmEvents`);
                url.searchParams.append('alarmId', alarmId);

                const response = await this.helpers.request({
                    method: 'GET',
                    url: url.toString(),
                    headers: { SessionID: sessionId },
                });

                const parsedData = parser.parse(response);
                const alarmsData = parsedData.ArrayOfEventRow.EventRow;

                if (!alarmsData || (Array.isArray(alarmsData) && alarmsData.length === 0)) {
                    returnData.push({ json: { message: "Il n'y a pas d'alarme" } });
                } else returnData.push({ json: { result: this.helpers.returnJsonArray(alarmsData) } });
            }

            if (operation === 'removeAllAlarms') {
                const url = new URL(`http://${ip}/AppVisionService.svc/RemoveAllAlarms`);
                try {
                    await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });
                    returnData.push({ json: { result: "Il n'y a plus d'alarme" } });
                } catch (error) {
                    returnData.push({ json: { result: "Requete non etablie" } });
                }
            }

            if (operation === 'maskAlarm') {
                const opName = this.getNodeParameter('opName', 0) as string;
                const isMasked = this.getNodeParameter('isMasked', 0) as boolean;
                const tempo = this.getNodeParameter('tempo', 0) as number;

                const url = new URL(`http://${ip}/AppVisionService.svc/MaskAlarm`);
                url.searchParams.append('opName', opName);
                url.searchParams.append('isMasked', isMasked.toString());
                url.searchParams.append('tempo', tempo.toString());

                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });
                    returnData.push({ json: { success: true, response: response } });
                } catch (error) {
                    if (error.statusCode === 400) {
                        returnData.push({ json: { success: false, error: 'Le nom de l\'opération n\'existe pas.' } });
                    } else {
                        returnData.push({ json: { success: false, error: 'Erreur lors de l\'exécution de MaskAlarm' } });
                    }
                }
            }

            if (operation === 'acknowledgeAlarmById') {
                const url = new URL(`http://${ip}/AppVisionService.svc/AcknowledgeAlarmById`);
                const alarmId = this.getNodeParameter('alarmId', 0) as string;

                url.searchParams.append('id', alarmId);
                try {

                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });
                    returnData.push({ json: { message: response } });

                } catch (error) {
                    returnData.push({ json: { result: "Requete non etablie" } });
                }
            }

            if (operation === 'start') {
                const url = new URL(`http://${ip}/AppVisionService.svc/StartSupervision`);
                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });
                    returnData.push({ json: { success: true, response: response } });
                } catch (error) {
                    returnData.push({ json: { success: false, error: 'Erreur lors du démarrage de la supervision' } });
                }
            }

            if (operation === 'stop') {
                const restart = this.getNodeParameter('restart', 0) as boolean;
                const url = new URL(`http://${ip}/AppVisionService.svc/StopSupervision?restart=${restart}`);
                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });
                    returnData.push({ json: { success: true, response: response } });
                } catch (error) {
                    returnData.push({ json: { success: false, error: 'Erreur lors de l\'arrêt de la supervision' } });
                }
            }

            if (operation === 'sendCommandToClient') {
                const clientName = this.getNodeParameter('clientName', 0) as string;
                const command = this.getNodeParameter('command', 0) as string;
                const parameters = this.getNodeParameter('parameters', 0) as string;

                const url = new URL(`http://${ip}/AppVisionService.svc/SendCommandToClient`);
                url.searchParams.append('clientName', clientName);
                url.searchParams.append('command', command);
                url.searchParams.append('parameter', parameters);

                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });
                    returnData.push({ json: { success: true, response: response } });
                } catch (error) {
                    if (error.statusCode === 400) {
                        returnData.push({ json: { success: false, error: 'Le nom du client n\'existe pas.' } });
                    } else {
                        returnData.push({ json: { success: false, error: 'Erreur lors de l\'envoi de la commande' } });
                    }
                }
            }
            if (operation === 'addModification') {
                const table = this.getNodeParameter('table', 0) as string;
                const type = this.getNodeParameter('type', 0) as number;
                const sourceId = this.getNodeParameter('sourceId', 0) as number;
                const sourceId2 = this.getNodeParameter('sourceId2', 0) as number;
                const sourceId3 = this.getNodeParameter('sourceId3', 0) as number;
                const userId = this.getNodeParameter('userId', 0) as number;
                const description = this.getNodeParameter('description', 0) as string;
                const info = this.getNodeParameter('info', 0) as string;

                const url = new URL(`http://${ip}/AppVisionService.svc/AddModification`);
                url.searchParams.append('table', table);
                url.searchParams.append('type', type.toString());
                url.searchParams.append('sourceId', sourceId.toString());
                url.searchParams.append('sourceId2', sourceId2.toString());
                url.searchParams.append('sourceId3', sourceId3.toString());
                url.searchParams.append('userId', userId.toString());
                url.searchParams.append('description', description);
                url.searchParams.append('info', info);

                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });
                    returnData.push({ json: { success: true, response: response } });
                } catch (error) {
                    returnData.push({ json: { success: false, error: 'Erreur lors de l\'ajout de la modification' } });
                }
            }
            if (operation === 'getUsersConnected') {
                const url = new URL(`http://${ip}/AppVisionService.svc/GetUsersConnected`);
                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });

                    const parsedData = parser.parse(response);
                    const clientsData = parsedData.ArrayOfClientInfo.ClientInfo;

                    if (!clientsData || (Array.isArray(clientsData) && clientsData.length === 0)) {
                        returnData.push({ json: { message: "Aucun utilisateur connecté" } });
                    } else {
                        returnData.push({ json: { result: this.helpers.returnJsonArray(clientsData) } });
                    }
                } catch (error) {
                    returnData.push({ json: { success: false, error: 'Erreur lors de la récupération des utilisateurs connectés' } });
                }
            }
            if (operation === 'getCurrentUser') {
                const url = new URL(`http://${ip}/AppVisionService.svc/GetCurrentUser`);

                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });

                    const parsedData = parser.parse(response);
                    const userData = parsedData.UserRow;

                    if (!userData) {
                        returnData.push({ json: { message: "Aucun utilisateur connecté" } });
                    } else {
                        returnData.push({ json: { result: userData } });
                    }
                } catch (error) {
                    returnData.push({ json: { success: false, error: 'Erreur lors de la récupération de l\'utilisateur actuel' } });
                }
            }

            if (operation === 'getProtocolsConnected') {
                const url = new URL(`http://${ip}/AppVisionService.svc/GetProtocolsConnected`);

                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });

                    const parsedData = parser.parse(response);
                    const clientsData = parsedData.ArrayOfClientInfo.ClientInfo;

                    if (!clientsData || (Array.isArray(clientsData) && clientsData.length === 0)) {
                        returnData.push({ json: { message: "Aucun protocole connecté" } });
                    } else {
                        returnData.push({ json: { result: this.helpers.returnJsonArray(clientsData) } });
                    }
                } catch (error) {
                    returnData.push({ json: { success: false, error: 'Erreur lors de la récupération des protocoles connectés' } });
                }
            }

            if (operation === 'getCurrentProtocol') {
                const url = new URL(`http://${ip}/AppVisionService.svc/GetCurrentProtocol`);

                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });

                    // Parser la réponse XML
                    const parsedData = parser.parse(response);
                    const protocolData = parsedData.ProtocolRow;

                    if (!protocolData) {
                        returnData.push({ json: { message: "Aucun protocole connecté" } });
                    } else {
                        returnData.push({ json: { result: protocolData } });
                    }
                } catch (error) {
                    returnData.push({ json: { success: false, error: 'Erreur lors de la récupération du protocole actuel' } });
                }
            }

            if (operation === 'sendDownloadToProtocol') {
                const varNames = this.getNodeParameter('varNames', 0) as string;
                const parameter = this.getNodeParameter('parameter', 0) as string;

                const url = new URL(`http://${ip}/AppVisionService.svc/SendDownloadToProtocol`);
                url.searchParams.append('varNames', varNames);
                url.searchParams.append('parameter', parameter);

                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });
                    returnData.push({ json: { success: true, response: response } });
                } catch (error) {
                    returnData.push({ json: { success: false, error: 'Erreur lors de l\'envoi de la demande de téléchargement' } });
                }
            }

            if (operation === 'cancelAlarm') {
                const alarmId = this.getNodeParameter('id', 0) as string;
                const comment = this.getNodeParameter('comment', 0) as string;

                const url = new URL(`http://${ip}/AppVisionService.svc/CancelAlarm`);
                url.searchParams.append('id', alarmId);

                // Créer le corps de la requête XML
                const xmlBody = `<string>${comment}</string>`;

                try {
                    const response = await this.helpers.request({
                        method: 'POST',
                        url: url.toString(),
                        headers: {
                            'Cookie': `SessionID=${sessionId}`,
                            'Content-Type': 'application/xml',
                            'Content-Length': xmlBody.length.toString(),
                        },
                        body: xmlBody,
                    });

                    returnData.push({ json: { success: true, response: response } });
                } catch (error) {
                    if (error.statusCode === 400) {
                        returnData.push({ json: { success: false, error: 'L\'ID de l\'alarme n\'existe pas.' } });
                    } else {
                        returnData.push({ json: { success: false, error: 'Erreur lors de l\'annulation de l\'alarme' } });
                    }
                }
            }

            if (operation === 'resumeAlarmById') {
                const alarmId = this.getNodeParameter('id', 0) as string;
                const transferUserId = this.getNodeParameter('transferUserId', 0) as number;

                const url = new URL(`http://${ip}/AppVisionService.svc/ResumeAlarmById`);
                url.searchParams.append('id', alarmId);
                url.searchParams.append('transferUserId', transferUserId.toString());

                try {
                    const response = await this.helpers.request({
                        method: 'GET',
                        url: url.toString(),
                        headers: { SessionID: sessionId },
                    });

                    returnData.push({ json: { success: true, response: response } });
                } catch (error) {
                    if (error.statusCode === 400) {
                        returnData.push({ json: { success: false, error: 'L\'ID de l\'alarme n\'existe pas.' } });
                    } else {
                        returnData.push({ json: { success: false, error: 'Erreur lors de la reprise de l\'alarme' } });
                    }
                }
            }



            /** a voir plus tard
            if (operation === 'updateAlarm') {
                console.log("Exécution de UpdateAlarm");
            
                // Récupérer les données de l'alarme depuis les paramètres
                const alarmData = this.getNodeParameter('alarmData', 0) as object;

                if (!alarmData || Object.keys(alarmData).length === 0) {
                    returnData.push({ json: { error: ' Aucune donnée d\'alarme fournie.' } });
                    return [returnData];
                }
                        
                // Générer un XML correct avec `fast-xml-parser`
                const builder = new XMLBuilder({
                    format: true,
                    ignoreAttributes: false,
                    suppressEmptyNode: true,
                });
            
                // Conversion correcte JSON → XML
                const xmlAlarmData = builder.build({ AlarmRow: alarmData });
            
                console.log("XML envoyé :", xmlAlarmData);
            
                // Vérifier la longueur du XML pour `Content-Length`
                const xmlBuffer = Buffer.from(xmlAlarmData, 'utf-8');
                const contentLength = xmlBuffer.length;
            
                const url = new URL(`http://${ip}/AppVisionService.svc/UpdateAlarm`);
            
                try {
                    const response = await this.helpers.request({
                        method: 'POST',
                        url: url.toString(),
                        headers: {
                            'Cookie': `SessionID=${sessionId}`,
                            'Content-Type': 'application/xml',
                            'Accept': 'application/xml',
                            'Content-Length': contentLength.toString(),
                        },
                        body: `<AlarmRow>
                        <Id>48</Id>
                        <Description>Mise à jour de l'alarme</Description>
                        <Severity>70</Severity>
                        <SourceId>1006</SourceId>
                      </AlarmRow>`
                      ,
                    });
            
                    const parser = new XMLParser({ ignoreAttributes: false });
                    const parsedResponse = parser.parse(response);
            
                    const updateSuccess = parsedResponse.boolean === "true";
            
                    returnData.push({
                        json: {
                            success: updateSuccess,
                            message: updateSuccess
                                ? "Alarme mise à jour avec succès"
                                : "Échec de la mise à jour de l'alarme",
                        },
                    });
            
                } catch (error) {
                    returnData.push({
                        json: {
                            success: false,
                            error: ` Erreur lors de l'envoi : ${error.message}`,
                        },
                    });
                }
            
                return [returnData];
            }
            */

        } catch (error) {
            returnData.push({ json: { success: false, error: error.message || error } });
        }

        return [returnData];
    }
}

