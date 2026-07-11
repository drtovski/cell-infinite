// The Tauri application entry point. Keeping the runnable logic in `lib.rs`
// (and calling it from `main.rs`) follows the Tauri v2 convention and keeps the
// door open for a future mobile target that shares the same `run()`.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running CELL: INFINITE");
}
