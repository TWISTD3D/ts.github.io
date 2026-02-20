# Profile Server (local)

A tiny Express server that serves your static files and provides a simple JSON API for shared profile persistence.

How to run:

1. Open PowerShell and change to the folder:

```powershell
cd "C:\Users\twist\Downloads\profile-server"
```

2. Install dependencies and start the server:

```powershell
npm install
npm start
```

3. Open the page in your browser (served by the same origin):

http://localhost:3000/mainhtml.html

Notes:
- The server stores data in `profile-data.json` in the same folder.
- You can stop the server with Ctrl+C.
- This is a minimal local solution for "shared" persistence visible to everyone who opens the page from this server.
