import { useParams } from 'react-router-dom'
import { PlaceholderPage } from '../../../components/ui/PlaceholderPage.tsx'

export function EmployeeDetailPage() {
  const { id } = useParams()
  const employeeId = id && id.length > 0 ? id : 'unknown'

  return (
    <PlaceholderPage
      title="Employee profile"
      description={`Profile placeholder for employee ${employeeId}.`}
    />
  )
}
