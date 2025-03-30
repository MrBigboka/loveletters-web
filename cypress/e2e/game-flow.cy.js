describe('Game Flow', () => {
  it('allows creating a game and playing basic actions', () => {
    // Start from home page
    cy.visit('http://localhost:3000')
    
    // Navigate to create game page
    cy.contains('button', 'Créer une partie').click()
    cy.url().should('include', '/lobby/create')
    
    // Enter player name
    cy.get('input[name="playerName"]').clear().type('CypressPlayer')
    
    // Create game
    cy.contains('button', 'Créer la partie').click()
    
    // Should be redirected to game page with lobby code
    cy.url().should('include', '/game')
    cy.url().should('include', 'lobby=')
    cy.url().should('include', 'host=true')
    
    // Game should initialize after a brief waiting period
    cy.contains('CypressPlayer', { timeout: 10000 })
    
    // Should see card elements and game interface
    cy.get('[class*="card-stack"]').should('exist')
    cy.get('[class*="card-hand"]').should('exist')
    
    // Should be able to draw a card (if it's player's turn)
    cy.contains('button', 'Piocher une carte').should('exist')
    cy.contains('button', 'Piocher une carte').click()
    
    // After drawing, should be able to select and play a card
    cy.get('.motion-div').first().click() // Select first card
    cy.contains('button', 'Jouer la carte').should('exist')
    
    // Check game log updates
    cy.contains('a pioché une carte')
  })
  
  it('allows joining an existing game with a code', () => {
    // Create a mock lobby code
    const lobbyCode = 'TEST-' + Math.random().toString(36).substring(2, 7).toUpperCase()
    
    // Start from home page
    cy.visit('http://localhost:3000')
    
    // Navigate to join game page
    cy.contains('button', 'Rejoindre une partie').click()
    cy.url().should('include', '/lobby/join')
    
    // Enter player name and lobby code
    cy.get('input[name="playerName"]').clear().type('JoiningPlayer')
    cy.get('input[name="lobbyCode"]').clear().type(lobbyCode)
    
    // Join game
    cy.contains('button', 'Rejoindre').click()
    
    // Should be redirected to game page with lobby code
    cy.url().should('include', '/game')
    cy.url().should('include', `lobby=${lobbyCode}`)
    
    // Since this is a test and not a real multiplayer session,
    // we just verify the UI elements are present
    cy.contains('En attente de joueurs', { timeout: 10000 }).should('exist')
  })
})
