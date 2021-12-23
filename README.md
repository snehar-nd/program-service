# Sunbird Program Service

### Prerequisites: Postgres, Node v12+

## Run Locally

Clone the project
```bash
    https://github.com/Sunbird-Ed/program-service.git
```

Go to the project directory
```bash
    cd program-service
```
Install Git Submodules to make use of
https://github.com/project-sunbird/sunbird-js-utils.git
```bash
    git submodule init
    git submodule update
```

Install dependencies
```bash
    cd src/
    npm install
```

Set the env variable in  `<project-folder>/src/envVariables.js`
```bash
    baseURL: process.env.dock_base_url || 'http://dock.sunbirded.org',
    SUNBIRD_URL: process.env.sunbird_base_url || 'https://dev.sunbirded.org',
    SUNBIRD_PORTAL_API_AUTH_TOKEN: process.env.sunbird_api_auth_token
```

Start the server
```bash
    node app.js
```
the node app will run on `http://localhost:6000`

> Note: To create Postgres table in the local db use the `<project-folder>/programs.sql`
