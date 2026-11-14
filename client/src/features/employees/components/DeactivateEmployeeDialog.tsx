import { Button } from 'primereact/button'
import { ConfirmDialog } from 'primereact/confirmdialog'

type DeactivateEmployeeDialogProps = {
  visible: boolean
  employeeName: string
  saving: boolean
  onHide: () => void
  onConfirm: () => void
}

export function DeactivateEmployeeDialog({
  visible,
  employeeName,
  saving,
  onHide,
  onConfirm,
}: DeactivateEmployeeDialogProps) {
  return (
    <ConfirmDialog
      className="deactivate-dialog"
      style={{ width: '26rem' }}
      visible={visible}
      closable={!saving}
      closeOnEscape={!saving}
      onHide={() => {
        if (!saving) {
          onHide()
        }
      }}
      header="Deactivate employee"
      icon="pi pi-exclamation-triangle"
      message={
        <div className="deactivate-dialog__message">
          <p>Deactivate {employeeName}?</p>
          <p>
            This changes their employment status to Deactivated. The employee record, salary, and salary revision history
            stay in the system and are not deleted.
          </p>
        </div>
      }
      footer={
        <div className="deactivate-dialog__actions">
          <Button type="button" label="Cancel" outlined disabled={saving} onClick={onHide} />
          <Button
            type="button"
            label="Deactivate"
            icon="pi pi-ban"
            severity="danger"
            loading={saving}
            disabled={saving}
            onClick={onConfirm}
          />
        </div>
      }
    />
  )
}
