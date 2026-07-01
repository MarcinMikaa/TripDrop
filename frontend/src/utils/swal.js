import Swal from 'sweetalert2';

export const swal = Swal.mixin({
  background: '#f5f2ee',
  color: '#0a0a0a',
  confirmButtonColor: '#5b8fa8',
  cancelButtonColor: '#a8845e',
  borderRadius: '20px',
});

export const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
  background: '#f5f2ee',
  color: '#0a0a0a',
});

export const swalConfirmDelete = (title, text) =>
  swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Usuń',
    cancelButtonText: 'Anuluj',
    reverseButtons: true,
  });

export const swalSuccess = (title, text) =>
  swal.fire({
    title,
    text,
    icon: 'success',
    timer: 2000,
    showConfirmButton: false,
  });

export const swalError = (title, text) =>
  swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: 'OK',
  });

export const swalInfo = (title, text) =>
  swal.fire({
    title,
    text,
    icon: 'info',
    confirmButtonText: 'OK',
  });

export const toastSuccess = (title) =>
  toast.fire({
    icon: 'success',
    title,
  });

export const toastError = (title) =>
  toast.fire({
    icon: 'error',
    title,
  });

export const toastInfo = (title) =>
  toast.fire({
    icon: 'info',
    title,
  });
