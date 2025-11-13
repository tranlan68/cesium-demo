# Production environment from built-in nginx
FROM nginx:alpine
COPY /dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d
CMD ["nginx", "-g", "daemon off;"]