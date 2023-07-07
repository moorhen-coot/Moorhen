### Using Docker image

```bash
$   cd .docker
$   docker build --tag="baby-gru" $(pwd)
$   docker run --name baby-gru-app -p 3000:3000 -d baby-gru /bin/bash
$   npm start
```

After you set up running the docker container, you will be able to access the app on `http://0.0.0.0:3000/`. You can detach the docker container using `Ctrl-Q`.

