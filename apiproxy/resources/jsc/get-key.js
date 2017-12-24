 var basePath = context.getVariable("basePath");
 
 if (!basePath) {
     throw new Error("Missing mandatory query param!");
 }
 