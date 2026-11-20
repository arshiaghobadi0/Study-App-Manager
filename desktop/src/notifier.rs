use std::path::Path;
use std::process::Command;

/// Sends a lightweight native OS desktop notification without external C/Obj-C build dependencies.
pub fn send_desktop_notification(title: &str, body: &str) {
    let title = title.to_string();
    let body = body.to_string();

    std::thread::spawn(move || {
        #[cfg(target_os = "linux")]
        {
            let _ = Command::new("notify-send")
                .arg("--app-name=برنامه‌ریز درسی هفتگی")
                .arg(&title)
                .arg(&body)
                .status();
        }

        #[cfg(target_os = "macos")]
        {
            let esc = |s: &str| s.replace('\\', "\\\\").replace('"', "\\\"");
            let script = format!(
                "display notification \"{}\" with title \"{}\"",
                esc(&body),
                esc(&title)
            );
            let _ = Command::new("osascript").arg("-e").arg(script).status();
        }

        #[cfg(target_os = "windows")]
        {
            let esc = |s: &str| s.replace('\'', "''");
            let script = format!(
                "Add-Type -AssemblyName System.Windows.Forms; \
                 $n = New-Object System.Windows.Forms.NotifyIcon; \
                 $n.Icon = [System.Drawing.SystemIcons]::Information; \
                 $n.Visible = $true; \
                 $n.ShowBalloonTip(5000, '{}', '{}', [System.Windows.Forms.ToolTipIcon]::Info); \
                 Start-Sleep -Seconds 5; $n.Dispose()",
                esc(&title),
                esc(&body)
            );
            let _ = Command::new("powershell")
                .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script])
                .status();
        }
    });
}

/// Plays a gentle native OS chime / system alert sound asynchronously.
pub fn play_system_chime() {
    std::thread::spawn(|| {
        #[cfg(target_os = "macos")]
        {
            let _ = Command::new("afplay")
                .arg("/System/Library/Sounds/Glass.aiff")
                .status();
        }

        #[cfg(target_os = "linux")]
        {
            let _ = Command::new("paplay")
                .arg("/usr/share/sounds/freedesktop/stereo/complete.oga")
                .status();
        }

        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-WindowStyle",
                    "Hidden",
                    "-Command",
                    "[console]::beep(880,140);[console]::beep(1174,180)",
                ])
                .status();
        }
    });
}

/// Opens a saved file or export directory using the native OS handler.
pub fn open_path_in_os(path: &Path) {
    let path_buf = path.to_path_buf();
    std::thread::spawn(move || {
        #[cfg(target_os = "linux")]
        {
            let _ = Command::new("xdg-open").arg(&path_buf).status();
        }

        #[cfg(target_os = "macos")]
        {
            let _ = Command::new("open").arg(&path_buf).status();
        }

        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("cmd")
                .args(["/C", "start", "", &path_buf.to_string_lossy()])
                .status();
        }
    });
}
