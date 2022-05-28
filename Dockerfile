FROM node:16

WORKDIR /usr/app
COPY package*.json yarn.lock ./

RUN yarn

COPY . .

EXPOSE 80
CMD ["yarn", "dev"]