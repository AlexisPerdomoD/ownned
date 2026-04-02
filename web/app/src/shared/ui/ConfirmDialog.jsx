import { createSignal } from 'solid-js'

import { Button } from './Button'
import { Modal } from './Modal'

/**
 * Diálogo de confirmación destructiva genérico.
 * Construido sobre `<Modal />`.
 *
 * @example
 * const [open, setOpen] = createSignal(false)
 *
 * <Button variant="danger" onClick={() => setOpen(true)}>Eliminar</Button>
 *
 * <ConfirmDialog
 *   open={open()}
 *   onClose={() => setOpen(false)}
 *   onConfirm={handleDelete}
 *   title="Eliminar documento"
 *   description="Esta acción no se puede deshacer."
 *   confirmLabel="Sí, eliminar"
 * />
 */

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void | Promise<void>} props.onConfirm      - Se llama al confirmar; si es async, muestra spinner.
 * @param {string} [props.title='¿Estás seguro?']
 * @param {string} [props.description]
 * @param {string} [props.confirmLabel='Confirmar']
 * @param {string} [props.cancelLabel='Cancelar']
 * @param {'danger' | 'accent' | 'primary'} [props.confirmVariant='danger']
 * @returns {import('solid-js').JSX.Element}
 */
export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title = '¿Estás seguro?',
    description,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    confirmVariant = 'danger'
}) {
    const [loading, setLoading] = createSignal(false)

    const handleConfirm = async () => {
        setLoading(true)
        try {
            await onConfirm?.()
            onClose()
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            description={description}
            size="sm"
            closeOnBackdrop={!loading()}
        >
            <Modal.Footer>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    disabled={loading()}
                >
                    {cancelLabel}
                </Button>
                <Button
                    variant={confirmVariant}
                    size="sm"
                    loading={loading()}
                    onClick={handleConfirm}
                >
                    {confirmLabel}
                </Button>
            </Modal.Footer>
        </Modal>
    )
}
