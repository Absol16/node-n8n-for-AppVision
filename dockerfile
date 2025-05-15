FROM n8nio/n8n:latest

USER root
RUN mkdir -p /usr/local/lib/node_modules/n8n-nodes-appvision && \
    chown -R node:node /usr/local/lib/node_modules/n8n-nodes-appvision

USER node
WORKDIR /usr/local/lib/node_modules/n8n-nodes-appvision

# First copy only package files and tsconfig
COPY --chown=node:node package.json package-lock.json tsconfig.json ./ 

# Install dependencies
RUN npm install n8n-workflow@0.28.0 @types/node@14 --save-exact --no-audit --no-fund && \
    npm install --include=dev --no-audit --no-fund

# Now copy the rest of the files
COPY --chown=node:node . .

# Run build
RUN npm run build && \
    npm cache clean --force

# Créer un volume pour stocker les sessions AppVision
VOLUME ["/usr/local/lib/node_modules/n8n-nodes-appvision/dist/nodes/AppVision/session"]

# Create symlink
RUN mkdir -p /home/node/.n8n/custom && \
    ln -s /usr/local/lib/node_modules/n8n-nodes-appvision /home/node/.n8n/custom
