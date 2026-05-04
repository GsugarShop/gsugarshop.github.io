# GSugar Order Portal

This repository is a full Node.js app that serves the public sweet shop store and the protected admin portal from the same server.

## Run locally

1. Open a terminal in the project folder.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000` in your browser.

## Deploying a working public site

This app requires a Node server, so GitHub Pages alone is not sufficient.

### Recommended: Render

1. Create a free account at https://render.com/
2. Connect your GitHub repository to Render.
3. Create a new Web Service.
   - Name: `gsugar-order-portal`
   - Environment: `Node`
   - Branch: `main`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add the following environment variables in Render:
   - `ADMIN_PASSWORD` = your admin password
   - `COOKIE_SECRET` = any random secret string
5. Deploy.

### What will work

- Public order placement
- Company portal order list
- Customer email status lookup
- Admin order status updates

## How it works

- `server.js` serves the static frontend and exposes `/api/orders`.
- `index.html` places orders and sends data to the same host.
- `admin.html` is protected by a server-side login and reads order status from `/api/orders`.
- `login.html` fetches orders by email from `/api/orders`.

## Important notes

- The app must be deployed as a Node.js service.
- If you want to use GitHub Pages, you still need a separate backend service.
- `data/orders.json` is used for order storage in this simple version.
