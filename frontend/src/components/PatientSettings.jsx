export default function PatientSettings() {
  return (
    <div>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-[#333333] pb-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-100 tracking-tight">
              Patient Settings
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Manage your profile, notifications &amp; recovery preferences
            </p>
          </div>
          <div className="bg-[#1e1e1e] border border-[#333333] px-3.5 py-1.5 rounded-lg text-xs text-gray-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">settings</span>
            Preferences
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-[#333333] rounded-xl bg-[#1e1e1e]/50 p-8 text-center space-y-4">
          <span className="material-symbols-outlined text-6xl text-gray-500">
            settings
          </span>
          <h3 className="text-xl font-bold text-gray-100">Account Settings</h3>
          <p className="text-sm text-gray-400 max-w-md">
            Manage profile information, daily check-in reminders, and language settings.
          </p>
        </div>
      </div>
    </div>
  );
}
