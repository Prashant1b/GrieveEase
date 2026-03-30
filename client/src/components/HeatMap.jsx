import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'

const getMarkerColor = (complaint) => {
  const now = new Date()
  if (['Closed', 'Resolved'].includes(complaint.status)) return '#1D9E75'
  if (complaint.slaDeadline && new Date(complaint.slaDeadline) < now) return '#E24B4A'
  if (complaint.status === 'In Progress') return '#378ADD'
  return '#EF9F27'
}

const getDaysSince = (date) => {
  const diff = new Date() - new Date(date)
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function HeatMap({ complaints }) {
  const validComplaints = complaints.filter(c =>
    c.location?.coordinates?.[0] !== 0 && c.location?.coordinates?.[1] !== 0
  )

  return (
    <MapContainer
      center={[18.5204, 73.8567]}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validComplaints.map((complaint) => (
        <CircleMarker
          key={complaint._id || complaint.ticketId}
          center={[complaint.location.coordinates[1], complaint.location.coordinates[0]]}
          radius={8}
          fillColor={getMarkerColor(complaint)}
          color={getMarkerColor(complaint)}
          weight={1}
          opacity={0.9}
          fillOpacity={0.7}
        >
          <Popup>
            <div className="text-xs space-y-1 min-w-32">
              <div className="font-bold text-gray-800">{complaint.ticketId}</div>
              <div><span className="font-medium">Category:</span> {complaint.category}</div>
              <div><span className="font-medium">Status:</span> {complaint.status}</div>
              <div><span className="font-medium">Area:</span> {complaint.areaName || complaint.pinCode}</div>
              <div><span className="font-medium">Filed:</span> {getDaysSince(complaint.createdAt)} days ago</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
