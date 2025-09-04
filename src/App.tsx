// Try legacy React import pattern
import * as React from "react";
import { useState, useEffect } from "react";

// Test both import methods
const App = () => {
  console.log("=== DEBUGGING REACT IMPORT ===");
  console.log("React namespace import:", React);
  console.log("Direct useState import:", useState);
  console.log("Direct useEffect import:", useEffect);
  console.log("===========================");

  // Try direct imported hooks first
  let message, setMessage;
  
  try {
    [message, setMessage] = useState("Testing direct useState import");
    console.log("✅ Direct useState import works!");
  } catch (error) {
    console.error("❌ Direct useState failed:", error);
    try {
      [message, setMessage] = React.useState("Testing React.useState");
      console.log("✅ React.useState works!");
    } catch (error2) {
      console.error("❌ React.useState also failed:", error2);
      // Complete fallback - no React hooks
      return (
        <div style={{ 
          minHeight: '100vh', 
          background: '#ff0000',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <h1>🚨 REACT IS BROKEN 🚨</h1>
          <p>React import is null - package corruption detected</p>
          <p>Check console for details</p>
        </div>
      );
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#00aa00',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column'
    }}>
      <h1>✅ REACT IS WORKING</h1>
      <p>{message}</p>
    </div>
  );
};

export default App;