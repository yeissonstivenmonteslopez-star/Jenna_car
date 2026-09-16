export function validateLogin(form) {
  const errors = {};
  if (!form.email.trim()) errors.email = 'Ingresa tu correo electrónico.';
  if (!form.password) errors.password = 'Ingresa tu contraseña.';
  return errors;
}

export function validateRegister(form) {
  const errors = {};
  ['nombre', 'apellido', 'telefono', 'email', 'password'].forEach((key) => {
    if (!form[key].trim()) errors[key] = 'Este campo es obligatorio.';
  });
  if (form.telefono && !/^\d{10}$/.test(form.telefono.trim())) errors.telefono = 'Ingresa exactamente 10 números.';
  if (form.password && form.password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  if (form.password !== form.confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden.';
  return errors;
}

export function validateRecoveryConfirm(form) {
  const errors = {};
  if (!form.code.trim()) errors.code = 'Ingresa el código recibido.';
  if (!form.password) errors.password = 'Ingresa una nueva contraseña.';
  if (form.password && form.password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  if (form.password !== form.confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden.';
  return errors;
}