import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { ImageUpload } from './ImageUpload'
import { MAX_IMAGE_BYTES, uploadsService, validateImageFile } from '../../services/uploads.service'

vi.mock('../../services/uploads.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/uploads.service')>()),
  uploadsService: { upload: vi.fn() },
}))

const photo = (type: string, size = 1024) => new File([new Uint8Array(size)], 'photo', { type })

describe('validateImageFile', () => {
  it('accepte JPEG, PNG et WebP jusqu\'à 5 Mo', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: MAX_IMAGE_BYTES })).toBeNull()
    expect(validateImageFile({ type: 'image/webp', size: 10 })).toBeNull()
  })

  it('refuse les autres formats et les fichiers trop lourds', () => {
    expect(validateImageFile({ type: 'image/gif', size: 10 })).toMatch(/Format non pris en charge/)
    expect(validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 })).toMatch(/5 Mo au maximum/)
  })
})

describe('ImageUpload', () => {
  const renderUpload = () => {
    const onUploaded = vi.fn()
    render(<ImageUpload id="photo" label="Photo du produit" value="" onUploaded={onUploaded} />)
    return { onUploaded, input: screen.getByLabelText('Photo du produit') }
  }

  it('envoie la photo et transmet l\'URL renvoyée par l\'API', async () => {
    vi.mocked(uploadsService.upload).mockResolvedValue({ data: { url: 'https://cdn.test/a.webp', content_type: 'image/webp', size_bytes: 1024 } } as AxiosResponse)
    const { onUploaded, input } = renderUpload()

    await userEvent.upload(input, photo('image/webp'))

    expect(onUploaded).toHaveBeenCalledWith('https://cdn.test/a.webp')
    expect(await screen.findByText('Photo envoyée')).toBeTruthy()
  })

  it('n\'envoie pas un fichier trop lourd et annonce l\'erreur', async () => {
    const { onUploaded, input } = renderUpload()

    await userEvent.upload(input, photo('image/png', MAX_IMAGE_BYTES + 1))

    expect(uploadsService.upload).not.toHaveBeenCalled()
    expect(onUploaded).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toMatch(/trop lourde/)
  })

  it('traduit le refus 413 du serveur', async () => {
    const config = { headers: new AxiosHeaders() }
    const response = { status: 413, statusText: '', data: {}, headers: {}, config } as AxiosResponse
    vi.mocked(uploadsService.upload).mockRejectedValue(new AxiosError('trop gros', AxiosError.ERR_BAD_REQUEST, config, null, response))
    const { input } = renderUpload()

    await userEvent.upload(input, photo('image/jpeg'))

    expect((await screen.findByRole('alert')).textContent).toBe('Photo trop lourde : 5 Mo au maximum.')
  })
})
