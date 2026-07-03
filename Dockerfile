FROM node:20-alpine

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie de tout le code source
COPY . .

# Création du dossier de stockage pour le volume persistant
RUN mkdir -p /app/data

# Exposition du port par défaut de Vite
EXPOSE 5173

# Lancement du serveur de développement (qui contient la mini-API dans vite.config.js)
CMD ["npm", "run", "dev"]
