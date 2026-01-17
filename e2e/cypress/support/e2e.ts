/// <reference types="cypress" />

import './commands'

// Fail tests on uncaught exceptions from the app
Cypress.on('uncaught:exception', (err) => {
  console.error('Uncaught exception:', err.message)
  return true // fail the test
})

// Spy on console errors for debugging
Cypress.on('window:before:load', (win) => {
  cy.spy(win.console, 'error').as('consoleError')
})
