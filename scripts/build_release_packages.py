import os
import zipfile
import tarfile
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

def create_packages():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True, exist_ok=True)

    version = "2.5.0"

    # 1. Windows Package
    win_zip_path = DIST / f"NSK-{version}-Windows.zip"
    print(f"Building {win_zip_path.name}...")
    with zipfile.ZipFile(win_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # Root files
        for fname in ["start.bat", "start.py", "scanner.py", "requirements.txt", "README.md", "LICENSE"]:
            fpath = ROOT / fname
            if fpath.exists():
                zf.write(fpath, arcname=f"NSK/{fname}")

        # Backend
        for root, dirs, files in os.walk(ROOT / "backend"):
            # skip __pycache__, .pytest_cache
            if "__pycache__" in root or ".pytest_cache" in root:
                continue
            for f in files:
                full_path = Path(root) / f
                rel_path = full_path.relative_to(ROOT)
                zf.write(full_path, arcname=f"NSK/{rel_path.as_posix()}")

    # 2. macOS & Linux Package (tar.gz with executable bits)
    unix_tar_path = DIST / f"NSK-{version}-macOS-Linux.tar.gz"
    print(f"Building {unix_tar_path.name}...")
    with tarfile.open(unix_tar_path, "w:gz") as tf:
        for fname in ["start.command", "start.sh", "NSK.desktop", "start.py", "scanner.py", "requirements.txt", "README.md", "LICENSE"]:
            fpath = ROOT / fname
            if fpath.exists():
                ti = tf.gettarinfo(fpath, arcname=f"NSK/{fname}")
                if fname in ["start.command", "start.sh", "NSK.desktop", "scanner.py", "start.py"]:
                    ti.mode = 0o755
                tf.addfile(ti, open(fpath, "rb"))

        # NSK.app bundle
        app_path = ROOT / "NSK.app"
        if app_path.exists():
            for root, dirs, files in os.walk(app_path):
                for f in files:
                    full_path = Path(root) / f
                    rel_path = full_path.relative_to(ROOT)
                    ti = tf.gettarinfo(full_path, arcname=f"NSK/{rel_path.as_posix()}")
                    if f == "NSK":
                        ti.mode = 0o755
                    tf.addfile(ti, open(full_path, "rb"))

        # Backend
        for root, dirs, files in os.walk(ROOT / "backend"):
            if "__pycache__" in root or ".pytest_cache" in root:
                continue
            for f in files:
                full_path = Path(root) / f
                rel_path = full_path.relative_to(ROOT)
                ti = tf.gettarinfo(full_path, arcname=f"NSK/{rel_path.as_posix()}")
                tf.addfile(ti, open(full_path, "rb"))

    # 3. Complete Source Package
    src_zip_path = DIST / f"NSK-{version}-Source.zip"
    print(f"Building {src_zip_path.name}...")
    with zipfile.ZipFile(src_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(ROOT):
            if any(ignore in root for ignore in [".git", "dist", "node_modules", "__pycache__", ".pytest_cache"]):
                continue
            for f in files:
                full_path = Path(root) / f
                rel_path = full_path.relative_to(ROOT)
                zf.write(full_path, arcname=f"NSK-{version}/{rel_path.as_posix()}")

    print("Packages created successfully:")
    for p in DIST.iterdir():
        size_mb = round(p.stat().st_size / (1024 * 1024), 2)
        print(f" - {p.name} ({size_mb} MB)")

if __name__ == "__main__":
    create_packages()
