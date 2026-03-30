const priorityConfig = {
  Critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  High: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  Medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  Low: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
}

export default function AIPreviewCard({ data, onChange }) {
  const pc = priorityConfig[data.priority] || priorityConfig.Medium
  const userMessage = data.citizenMessage || data.aiSummary

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">AI Analysis Result</h3>
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
          AI Assisted
        </span>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-xs font-medium text-green-700 mb-1">Message For Citizen</p>
        <p className="text-sm text-green-900">{userMessage}</p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-600 mb-1">Internal Summary</p>
        <p className="text-sm text-gray-800">{data.aiSummary}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Language Detected</label>
          <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
            {data.languageDetected}
          </span>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Priority</label>
          <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${pc.bg} ${pc.text} border ${pc.border}`}>
            {data.priority}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Category</label>
          <select
            value={data.category}
            onChange={(e) => onChange({ ...data, category: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {['Water Supply', 'Electricity', 'Roads', 'Sanitation', 'Ration / PDS', 'Hospital / Health', 'Police', 'Property Tax', 'Street Lights', 'Drainage', 'Other'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Department Being Routed To</label>
          <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
            {data.department}
          </div>
        </div>
      </div>

      {data.priorityReason && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
          <span className="font-medium">Priority reason: </span>{data.priorityReason}
        </div>
      )}

      {data.location && Object.values(data.location).some(Boolean) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700 mb-2">Location Detected From Complaint</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {data.location.areaName && (
              <div><span className="text-gray-500">Area: </span><span className="font-medium text-gray-800">{data.location.areaName}</span></div>
            )}
            {data.location.pinCode && (
              <div><span className="text-gray-500">PIN: </span><span className="font-medium text-gray-800">{data.location.pinCode}</span></div>
            )}
            {data.location.district && (
              <div><span className="text-gray-500">District: </span><span className="font-medium text-gray-800">{data.location.district}</span></div>
            )}
            {data.location.state && (
              <div><span className="text-gray-500">State: </span><span className="font-medium text-gray-800">{data.location.state}</span></div>
            )}
          </div>
          <p className="text-xs text-blue-500 mt-2">These fields have been auto-filled. You can edit them in the previous step.</p>
        </div>
      )}
    </div>
  )
}
