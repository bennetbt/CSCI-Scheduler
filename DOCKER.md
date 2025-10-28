# Docker Deployment Guide

This guide explains how to run the CSCI Class Scheduler in a Docker container with persistent data storage.

## Quick Start

### Prerequisites
- Docker installed on your system
- Docker Compose installed (included with Docker Desktop)

### Starting the Application

1. **Start the container:**
   ```bash
   docker-compose up -d
   ```

   The `-d` flag runs the container in detached mode (in the background).

2. **Access the application:**
   Open your browser and go to:
   ```
   http://localhost:3000
   ```

3. **Stop the container:**
   ```bash
   docker-compose stop
   ```

4. **Start the container again:**
   ```bash
   docker-compose start
   ```

5. **Stop and remove the container:**
   ```bash
   docker-compose down
   ```

   **Note:** This does NOT delete your data. The data is stored in a Docker volume and persists even after the container is removed.

## Data Persistence

Your schedule data is automatically saved to a Docker volume named `scheduler-data`. This means:

- ✅ Data persists when you stop the container
- ✅ Data persists when you restart your computer
- ✅ Data persists even if you remove the container with `docker-compose down`
- ✅ You can update the application and keep your data

### Viewing Your Data

The data is stored in a JSON file inside the Docker volume. To view it:

```bash
docker-compose exec scheduler cat /data/schedule-data.json
```

### Backing Up Your Data

To backup your schedule data:

```bash
docker-compose exec scheduler cat /data/schedule-data.json > backup-$(date +%Y%m%d).json
```

### Restoring from Backup

To restore data from a backup file:

```bash
cat backup-20241028.json | docker-compose exec -T scheduler sh -c 'cat > /data/schedule-data.json'
docker-compose restart
```

### Completely Removing All Data

**WARNING:** This will delete all your schedule data permanently!

```bash
docker-compose down -v
```

The `-v` flag removes the volume along with the container.

## Common Commands

### View Logs
```bash
docker-compose logs -f
```

### Check Container Status
```bash
docker-compose ps
```

### Rebuild After Code Changes
```bash
docker-compose up -d --build
```

### Access Container Shell
```bash
docker-compose exec scheduler sh
```

## Using a Different Port

If port 3000 is already in use, edit `docker-compose.yml` and change:

```yaml
ports:
  - "3000:3000"
```

to:

```yaml
ports:
  - "8080:3000"  # Use port 8080 instead
```

Then restart the container:

```bash
docker-compose up -d
```

## Automatic Restarts

The container is configured with `restart: unless-stopped`, which means:
- It will automatically restart if it crashes
- It will start automatically when your computer boots
- It will NOT restart if you manually stop it

## Health Checks

The container includes a health check that runs every 30 seconds. You can check the health status:

```bash
docker-compose ps
```

Look for the "Status" column - it should show "healthy" after the container starts.

## Troubleshooting

### Container won't start
```bash
docker-compose logs
```

### Can't connect to the application
1. Check if the container is running:
   ```bash
   docker-compose ps
   ```

2. Check if port 3000 is accessible:
   ```bash
   curl http://localhost:3000/health
   ```

### Data not saving
1. Check if the volume exists:
   ```bash
   docker volume ls
   ```

2. Check volume contents:
   ```bash
   docker-compose exec scheduler ls -la /data
   ```

## Development vs Production

For development, you can mount the current directory to see live changes:

```yaml
volumes:
  - scheduler-data:/data
  - .:/app  # Add this line for development
```

Then run:
```bash
docker-compose up
```

## Security Notes

- The application runs on all interfaces (0.0.0.0) inside the container
- Only port 3000 is exposed to your host machine
- No authentication is configured by default
- For production use, consider adding a reverse proxy with SSL/TLS

## Advanced: Multiple Instances

To run multiple instances (e.g., for different departments):

1. Copy the directory to a new location
2. Edit `docker-compose.yml` and change:
   - Container name: `container_name: csci-scheduler-dept2`
   - Port mapping: `"3001:3000"`
   - Volume name: `scheduler-data-dept2:/data`

3. Start each instance from its respective directory

## Support

For issues or questions, check:
- Container logs: `docker-compose logs`
- Application README: `README.md`
- GitHub issues: (if applicable)
