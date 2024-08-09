---
image:
  url: "./titleImage.webp"
  alt: "Expose WSL Port to other adapter interfaces"
title: Expose WSL Port
description: "Expose WSL Port to other adapter interfaces"
tags:
  ["howTo", "expose port", "wsl", "port", "expose local", "local", "windows"]
---

# How to expose wsl port to other interfaces

While working on a project using WSL, I noticed that I was not able to access my development server from other devices connected within the same local network. This is because WSL creates a virtual LAN that is not exposed to other network interfaces. To make my development server accessible from other devices on the network, I had to expose the WSL port to other interfaces. Here is how I did it.

### Command

To expose a WSL port to other interfaces, use the following netsh command in Windows PowerShell or Command Prompt:

```bash
netsh interface portproxy set v4tov4 listenport=8888 listenaddress=0.0.0.0 connectport=8888 connectaddress=$(wsl hostname -I)
```

- **_listenport=8888_**: The port on the Windows host you want to listen to.
- **_listenaddress=0.0.0.0_**: Listens on all interfaces.
- **_connectport=8888_**: The port inside WSL you want to expose.
- **_connectaddress=$(wsl hostname -I)_**: The IP address of the WSL instance.

reference - https://stackoverflow.com/questions/64513964/wsl-2-which-ports-are-automatically-forwarded

### Adding Port to Firewall (Windows)

Merely exposing the port didn't work for me, I also had to add the port to the firewall.

I Followed these steps to add the port to the Windows Firewall:

1. Click **Start**, then navigate to **Control Panel**.
2. Select **Windows Firewall**, then choose **Advanced Settings**.
3. On the left pane, click **Inbound Rules**, then click **New Rule** on the right pane.
4. Choose **Port** as the rule type, then click **Next**.
5. On the **Protocol and Ports** page, select either **TCP** or **UDP**, and specify **Specific local ports** or **All local ports**.
6. Enter the port number you want to open, then click **Next**.
7. On the **Action** page, select **Allow the connection**, and click **Next**.
8. On the **Profile** page, choose the appropriate options for your environment, and click **Next**.
9. Finally, name the rule and click **Finish**.
