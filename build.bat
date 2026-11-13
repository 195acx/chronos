@echo off
echo Building Chronos with MSYS2 GCC...
g++ -O2 -std=c++17 src/main.cpp src/GdbBackend.cpp -Ithird_party -Isrc -lws2_32 -o chronos.exe
if %ERRORLEVEL% EQU 0 (
    echo [Build Succeeded] chronos.exe created successfully.
    echo To run the interactive IDE: .\chronos.exe
    echo To debug a file in console: .\chronos.exe file.cpp --no-server
) else (
    echo [Build Failed]
)
