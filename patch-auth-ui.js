const fs = require("fs");
const p = "FrontEnd/index.html";
let c = fs.readFileSync(p, "utf8");
const NL = "\r\n";
const results = [];
function rep(oldS, newS, label) {
  if (c.includes(oldS)) {
    c = c.split(oldS).join(newS);
    results.push("OK   " + label);
  } else {
    results.push("MISS " + label);
  }
}

/* 1. Google button + forgot link under the login form */
rep(
  '<span id="adminSubmitText">Sign in</span>' + NL +
    "          </button>" + NL +
    "        </form>",
  '<span id="adminSubmitText">Sign in</span>' + NL +
    "          </button>" + NL +
    NL +
    '          <button type="button" class="form-button" style="background:#4285F4;"' + NL +
    '            onclick="signInWithGoogle()">' + NL +
    "            Continue with Google" + NL +
    "          </button>" + NL +
    NL +
    '          <a href="#" id="forgotLink"' + NL +
    '            style="display:block;text-align:center;margin-top:10px;color:#66717c;"' + NL +
    '            onclick="showForgotPassword(event)">Forgot password?</a>' + NL +
    NL +
    "        </form>",
  "forgot link + google button"
);

/* 2. Forgot-password modal before ADMIN PANEL section */
rep(
  "    <!-- ================= ADMIN PANEL ================= -->",
  '    <!-- ================= FORGOT PASSWORD MODAL ================= -->' + NL +
    NL +
    '    <div id="forgotPasswordModal" class="modal">' + NL +
    '      <div class="modal-content">' + NL +
    '        <span class="close" onclick="closeModal(\'forgotPasswordModal\')">' + NL +
    "          &times;" + NL +
    "        </span>" + NL +
    NL +
    "        <h2>Reset Password</h2>" + NL +
    "        <br />" + NL +
    '        <div id="forgotStep1">' + NL +
    '          <form id="forgotForm">' + NL +
    '            <div class="form-group">' + NL +
    "              <label>Admin Name</label>" + NL +
    '              <input type="text" id="forgotName" required />' + NL +
    "            </div>" + NL +
    '            <div class="form-group">' + NL +
    "              <label>Email</label>" + NL +
    '              <input type="email" id="forgotEmail" required />' + NL +
    "            </div>" + NL +
    '            <button type="submit" class="form-button">Send confirmation code</button>' + NL +
    '            <small class="form-hint">' + NL +
    "              A code will be emailed to you. It is valid for 2 hours." + NL +
    "              If it expires, submit again to receive a new one." + NL +
    "            </small>" + NL +
    "          </form>" + NL +
    "        </div>" + NL +
    '        <div id="forgotStep2" class="hidden">' + NL +
    '          <form id="resetForm">' + NL +
    '            <div class="form-group">' + NL +
    "              <label>Confirmation code (from your email)</label>" + NL +
    '              <input type="text" id="resetCode" required />' + NL +
    "            </div>" + NL +
    '            <div class="form-group">' + NL +
    "              <label>New password</label>" + NL +
    '              <input type="password" id="resetPassword" required />' + NL +
    "            </div>" + NL +
    '            <button type="submit" class="form-button">Reset password</button>' + NL +
    '            <button type="button" class="form-button" style="background:#66717c;"' + NL +
    '              onclick="resendForgotCode()">Resend code</button>' + NL +
    "          </form>" + NL +
    "        </div>" + NL +
    "      </div>" + NL +
    "    </div>" + NL +
    NL +
    "    <!-- ================= ADMIN PANEL ================= -->",
  "forgot modal html"
);

/* 3. JS logic before START APPLICATION */
rep(
  "      /*" + NL +
    "        ====================================================" + NL +
    "        START APPLICATION",
  "      /* FORGOT PASSWORD FLOW */" + NL +
    "      let forgotEmailSaved = \"\";" + NL +
    "      let forgotNameSaved = \"\";" + NL +
    NL +
    "      function showForgotPassword(event) {" + NL +
    "        if (event) event.preventDefault();" + NL +
    '        document.getElementById("forgotStep1").classList.remove("hidden");' + NL +
    '        document.getElementById("forgotStep2").classList.add("hidden");' + NL +
    '        document.getElementById("forgotPasswordModal").style.display = "flex";' + NL +
    "      }" + NL +
    NL +
    "      async function requestForgotCode(name, email) {" + NL +
    "        const response = await fetch(`${API_URL}/admin/forgot-password`, {" + NL +
    '          method: "POST",' + NL +
    '          headers: { "Content-Type": "application/json" },' + NL +
    "          body: JSON.stringify({ name, email })," + NL +
    "        });" + NL +
    "        const data = await response.json().catch(() => ({}));" + NL +
    "        if (!response.ok) throw new Error(data.message || \"Unable to send code.\");" + NL +
    "        return data;" + NL +
    "      }" + NL +
    NL +
    "      document" + NL +
    '        .getElementById("forgotForm")' + NL +
    '        .addEventListener("submit", async function (event) {' + NL +
    "          event.preventDefault();" + NL +
    "          const name = document.getElementById(\"forgotName\").value.trim();" + NL +
    "          const email = document.getElementById(\"forgotEmail\").value.trim();" + NL +
    "          try {" + NL +
    "            await requestForgotCode(name, email);" + NL +
    "            forgotEmailSaved = email;" + NL +
    "            forgotNameSaved = name;" + NL +
    '            document.getElementById("forgotStep1").classList.add("hidden");' + NL +
    '            document.getElementById("forgotStep2").classList.remove("hidden");' + NL +
    '            showMessage("Confirmation code sent. Check your email (valid 2 hours).");' + NL +
    "          } catch (error) {" + NL +
    "            showMessage(error.message, false);" + NL +
    "          }" + NL +
    "        });" + NL +
    NL +
    "      async function resendForgotCode() {" + NL +
    "        try {" + NL +
    "          await requestForgotCode(forgotNameSaved, forgotEmailSaved);" + NL +
    '          showMessage("A new confirmation code has been sent to your email.");' + NL +
    "        } catch (error) {" + NL +
    "          showMessage(error.message, false);" + NL +
    "        }" + NL +
    "      }" + NL +
    NL +
    "      document" + NL +
    '        .getElementById("resetForm")' + NL +
    '        .addEventListener("submit", async function (event) {' + NL +
    "          event.preventDefault();" + NL +
    "          const code = document.getElementById(\"resetCode\").value.trim();" + NL +
    "          const password = document.getElementById(\"resetPassword\").value;" + NL +
    "          try {" + NL +
    "            const response = await fetch(`${API_URL}/admin/reset-password`, {" + NL +
    '              method: "POST",' + NL +
    '              headers: { "Content-Type": "application/json" },' + NL +
    "              body: JSON.stringify({ email: forgotEmailSaved, code, password })," + NL +
    "            });" + NL +
    "            const data = await response.json().catch(() => ({}));" + NL +
    "            if (data.expired) {" + NL +
    '              showMessage("Code expired - a new code has been sent.", false);' + NL +
    "              await resendForgotCode();" + NL +
    "              return;" + NL +
    "            }" + NL +
    "            if (!response.ok) throw new Error(data.message || \"Reset failed.\");" + NL +
    '            closeModal("forgotPasswordModal");' + NL +
    '            document.getElementById("resetForm").reset();' + NL +
    '            document.getElementById("forgotForm").reset();' + NL +
    '            showMessage("Password reset successful. You can now sign in.");' + NL +
    "          } catch (error) {" + NL +
    "            showMessage(error.message, false);" + NL +
    "          }" + NL +
    "        });" + NL +
    NL +
    "      /* GOOGLE SIGN-IN via the Cognito Hosted UI */" + NL +
    "      function signInWithGoogle() {" + NL +
    "        if (!cognitoConfig || !cognitoConfig.cognitoDomain) {" + NL +
    '          showMessage("Google sign-in is not configured yet.", false);' + NL +
    "          return;" + NL +
    "        }" + NL +
    "        const redirectUri = window.location.origin + window.location.pathname;" + NL +
    "        const url =" + NL +
    "          cognitoConfig.cognitoDomain +" + NL +
    '          "/oauth2/authorize?identity_provider=Google&redirect_uri=" +' + NL +
    "          encodeURIComponent(redirectUri) +" + NL +
    '          "&response_type=token&client_id=" +' + NL +
    "          encodeURIComponent(cognitoConfig.clientId) +" + NL +
    '          "&scope=email+openid+profile";' + NL +
    "        window.location.href = url;" + NL +
    "      }" + NL +
    NL +
    "      /* Handle tokens returned by the Hosted UI redirect. */" + NL +
    "      (function handleGoogleRedirect() {" + NL +
    "        const hash = window.location.hash.substring(1);" + NL +
    "        if (!hash) return;" + NL +
    "        const params = new URLSearchParams(hash);" + NL +
    '        const accessToken = params.get("access_token");' + NL +
    "        if (!accessToken) return;" + NL +
    '        const idToken = params.get("id_token");' + NL +
    "        cognitoTokens = { accessToken, idToken };" + NL +
    "        adminLoggedIn = true;" + NL +
    '        signedInAdminName = "google-user";' + NL +
    '        localStorage.setItem("cognitoTokens", JSON.stringify(cognitoTokens));' + NL +
    '        localStorage.setItem("adminUsername", signedInAdminName);' + NL +
    '        window.location.hash = "";' + NL +
    "        showAdminPanel();" + NL +
    "      })();" + NL +
    NL +
    "      /*" + NL +
    "        ====================================================" + NL +
    "        START APPLICATION",
  "forgot + google JS logic"
);

fs.writeFileSync(p, c);
console.log(results.join("\n"));
