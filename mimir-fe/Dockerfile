# This is the parent image. You can download a parent image from Dockerhub. This creates the base environment for the app to run in. 
FROM node:18-alpine

# Create a working directory for the image. Normally this would be /app.
WORKDIR /app

# We copy only the package.json file into the /app directory of the image. We can then run the 'npm install' command. We do this because every image file is cached when built the first time. This make build time a lot faster the second time around, as most of the work is done already, and the layers that remain the same in a new build will be grabbed from the cache, thereby improving the runtime of the build and saving a lot of time.
COPY package.json .

# The RUN command will run the command inside the image file. This will run, meaning that all the dependancies will be installed on the image. 
RUN npm install

##############
# The above will all be cahced. If we create another build and nothing in the above layers have changed, the runtime of the build will much faster.

# Copy the source code. The first dot represents which files to copy in the directory. The second dot is where to copy the files to in the image. It will be copied into the /app directory, as we set this as the working directory earlier.
COPY . .

# We explicity set the port for the Dockerfile to listen to. The container will own this port when the image is run inside it, so we need open it for the computer to be able to send requests to it.
EXPOSE 3000

# The CMD command will run the image. Like the command we use to type in the terminal to launch the application. It's written as an array of words.
CMD ["npm", "start"]