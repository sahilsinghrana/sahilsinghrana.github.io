---
image:
  url: "./titleImage.webp"
  alt: "Command to download file using curl."
title: Download file using curL
description: "Command to download file using curl."
tags:
  [
    "howTo",
    "download",
    "file",
    "curl",
    "bash",
    "download file using curl",
    "cli download",
  ]
featured: true
---

# Download File Using Curl Command

`curl` is a command-line tool used to transfer data from or to a server using various protocols such as HTTP, HTTPS, FTP, and more. Let's see how we can download file from remote server to our system using the tool.

## What is curl?

> curl is used in command lines or scripts to transfer data. curl is also used in cars, television sets, routers, printers, audio equipment, mobile phones, tablets, medical devices, settop boxes, computer games, media players and is the Internet transfer engine for thousands of software applications in over twenty billion installations.

> curl is used daily by virtually every Internet-using human on the globe.
>
> -- [Taken from official website](https://curl.se/#:~:text=curl%20is%20used,on%20the%20globe.)

## Prerequisites

Before using the `curl` command, ensure curL is installed in your system:

1. **Operating System**: `curl` is available on most Unix-like operating systems (Linux, macOS) and Windows. Make sure your OS supports `curl`.
2. **Install**: Verify if `curl` is installed on your system. Open your terminal and type:
   ```bash
   curl --version
   ```
   If it's not installed, you can install it using the package manager:
   - **Linux** (Debian/Ubuntu):
     ```bash
     sudo apt-get install curl
     ```
   - **macOS**:
     ```bash
     brew install curl
     ```
   - **Windows**: Download from [curl official website](https://curl.se/download.html) or use a package manager like `choco`:
     ```bash
     choco install curl
     ```

## Command

To download a file using `curl`, you can use the following command:

```bash
curl -o ./outputDir/filename.ext url-to-resource
```

#### Understanding commands

Let's break down the keywords of the command:

- **_curl_**: Invokes the curl tool.
- **_-o ./outputDir/filename.ext_**: The -o flag specifies the output file path and name of the file. Replace ./outputDir/filename.ext with the desired directory and filename where you want to save the downloaded file.

- **_url-to-resource_**: URL of the file you want to download. Replace url-to-resource with the actual URL of the file.
