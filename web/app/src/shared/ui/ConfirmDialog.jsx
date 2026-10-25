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
export function ConfirmDialog(props) {
    // NOTE: props no se destructuran para que open reaccione (Solid).
    const [loading, setLoading] = createSignal(false)

    const handleConfirm = async () => {
        setLoading(true)
        try {
            await props.onConfirm?.()
            props.onClose?.()
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            open={props.open}
            onClose={props.onClose}
            title={props.title ?? '¿Estás seguro?'}
            description={props.description}
            size="sm"
            closeOnBackdrop={!loading()}
        >
            <Modal.Footer>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => props.onClose?.()}
                    disabled={loading()}
                >
                    {props.cancelLabel ?? 'Cancelar'}
                </Button>
                <Button
                    variant={props.confirmVariant ?? 'danger'}
                    size="sm"
                    loading={loading()}
                    onClick={handleConfirm}
                >
                    {props.confirmLabel ?? 'Confirmar'}
                </Button>
            </Modal.Footer>
        </Modal>
    )
}
