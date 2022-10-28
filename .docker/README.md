### Using Docker image

```bash
$   docker build -t babyGruImage
$   docker run --name babyGruContainer -p 3000:3000 -d babyGruImage 
```

After you set up running the docker container, you will be able to access the app on `http://0.0.0.0:3000/`.

