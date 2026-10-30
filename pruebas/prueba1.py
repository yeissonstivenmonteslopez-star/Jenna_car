"""Registra una cuenta de prueba en la pagina local de Jenna Car.

Configura JENNA_TEST_PASSWORD antes de ejecutar el script o ingresa la
contraseña cuando se solicite. El correo se genera de nuevo en cada ejecucion.
"""

import getpass
import os
import uuid
from urllib.parse import urlparse

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


REGISTER_URL = os.getenv(
    "JENNA_REGISTER_URL",
    "http://localhost:5173/register",
)


def main() -> None:
    email = os.getenv(
        "JENNA_TEST_EMAIL",
        f"prueba.selenium.{uuid.uuid4().hex[:12]}@example.com",
    )
    password = os.getenv("JENNA_TEST_PASSWORD") or getpass.getpass(
        "Contraseña de prueba (mínimo 8 caracteres): "
    )
    if len(password) < 8:
        raise ValueError("La contraseña debe tener al menos 8 caracteres.")

    driver = webdriver.Edge()
    try:
        driver.get(REGISTER_URL)
        wait = WebDriverWait(driver, 20)

        form_values = {
            "nombre": os.getenv("JENNA_TEST_NOMBRE", "Prueba"),
            "apellido": os.getenv("JENNA_TEST_APELLIDO", "Selenium"),
            "documento": os.getenv("JENNA_TEST_DOCUMENTO", ""),
            "telefono": os.getenv("JENNA_TEST_TELEFONO", "3001234567"),
            "email": email,
            "password": password,
            "confirmation": password,
        }
        for field_name, value in form_values.items():
            wait.until(EC.visibility_of_element_located((By.NAME, field_name))).send_keys(value)

        wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "form button"))
        ).click()

        def registration_finished(browser: webdriver.Chrome) -> bool:
            has_error = browser.find_elements(By.CSS_SELECTOR, '[role="alert"]')
            current_path = urlparse(browser.current_url).path.rstrip("/")
            return bool(has_error) or current_path != "/register"

        try:
            wait.until(registration_finished)
        except TimeoutException as exc:
            raise TimeoutException(
                "El formulario no confirmó el registro en 20 segundos."
            ) from exc

        errors = driver.find_elements(By.CSS_SELECTOR, '[role="alert"]')
        if errors:
            raise RuntimeError(f"No se pudo registrar la cuenta: {errors[0].text}")

        print(f"Registro exitoso. Correo de prueba: {email}")
        print(f"Página final: {driver.current_url}")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()