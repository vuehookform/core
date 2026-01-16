describe('Validation Modes', () => {
  beforeEach(() => {
    cy.visit('/validation-modes')
  })

  describe('onSubmit mode (default)', () => {
    it('should not validate on input or blur', () => {
      cy.fillInput('email-input', 'invalid')
      cy.getByTestId('username-input').focus()
      cy.getByTestId('email-input').blur()

      cy.getByTestId('email-error').should('not.exist')
    })

    it('should validate on submit', () => {
      cy.fillInput('email-input', 'invalid')
      cy.getByTestId('submit-button').click()

      cy.expectError('email-error', 'Invalid email')
    })
  })

  describe('onBlur mode', () => {
    beforeEach(() => {
      cy.selectDropdownOption('mode-selector', 'onBlur')
      // Wait for form to re-render with new mode
      cy.getByTestId('email-input').should('exist')
    })

    it('should validate when field loses focus', () => {
      cy.fillInput('email-input', 'invalid')
      cy.getByTestId('username-input').focus() // Triggers blur on email

      cy.expectError('email-error', 'Invalid email')
    })

    it('should not validate during typing', () => {
      cy.getByTestId('email-input').type('inv')
      cy.getByTestId('email-error').should('not.exist')
    })

    it('should clear error when valid value entered and blurred', () => {
      cy.fillInput('email-input', 'invalid')
      cy.getByTestId('username-input').focus()
      cy.expectError('email-error', 'Invalid email')

      cy.clearInput('email-input')
      cy.fillInput('email-input', 'valid@example.com')
      cy.getByTestId('username-input').focus()

      cy.getByTestId('email-error').should('not.exist')
    })
  })

  describe('onChange mode', () => {
    beforeEach(() => {
      cy.selectDropdownOption('mode-selector', 'onChange')
      // Wait for form to re-render with new mode
      cy.getByTestId('email-input').should('exist')
    })

    it('should validate on every keystroke', () => {
      cy.getByTestId('email-input').type('i')
      cy.expectError('email-error', 'Invalid email')

      cy.clearInput('email-input')
      cy.fillInput('email-input', 'test@example.com')
      cy.getByTestId('email-error').should('not.exist')
    })

    it('should show error immediately when typing invalid value', () => {
      cy.getByTestId('username-input').type('ab')
      cy.expectError('username-error', 'Username must be at least 3 characters')

      cy.getByTestId('username-input').type('c')
      cy.getByTestId('username-error').should('not.exist')
    })
  })

  describe('onTouched mode', () => {
    beforeEach(() => {
      cy.selectDropdownOption('mode-selector', 'onTouched')
      // Wait for form to re-render with new mode
      cy.getByTestId('email-input').should('exist')
    })

    it('should not validate before touch', () => {
      cy.getByTestId('email-input').type('i')
      cy.getByTestId('email-error').should('not.exist')
    })

    it('should validate on blur (first touch)', () => {
      cy.fillInput('email-input', 'invalid')
      cy.getByTestId('username-input').focus()

      cy.expectError('email-error', 'Invalid email')
    })

    it('should validate on change after touch', () => {
      // First touch the field
      cy.fillInput('email-input', 'invalid')
      cy.getByTestId('username-input').focus()
      cy.expectError('email-error', 'Invalid email')

      // Now changes should trigger validation
      cy.clearInput('email-input')
      cy.fillInput('email-input', 'test@example.com')
      cy.getByTestId('email-error').should('not.exist')

      cy.clearInput('email-input')
      cy.fillInput('email-input', 'invalid-again')
      cy.expectError('email-error', 'Invalid email')
    })
  })
})
