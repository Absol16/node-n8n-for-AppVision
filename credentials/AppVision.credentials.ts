import {
    ICredentialType,
    INodeProperties,
    IAuthenticateGeneric,
  } from 'n8n-workflow';
  
  export class AppVision implements ICredentialType {
    name = 'appVisionCredentials';
    displayName = 'AppVision Credentials';
    properties: INodeProperties[] = [
      {
        displayName: 'Username',
        name: 'username',
        type: 'string',
        required: true,
        default: '',
        description: 'The username for AppVision authentication',
      },
      {
        displayName: 'Password',
        name: 'password',
        type: 'string',
        required: true,
        typeOptions: {
          password: true,
        },
        default: '',
        description: 'The password for AppVision authentication',
      },
      {
        displayName: 'IP Address',
        name: 'ip',
        type: 'string',
        required: true,
        default: '',
        description: 'The IP address of the AppVision server',
      },
    ];

    authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{ $credentials.username }}',
				password: '={{ $credentials.password }}',
			},
			qs: {
                ip: '={{ $credentials.ip }}',  // Send the IP address along with the request
              },
		},
	};
  }
  
  