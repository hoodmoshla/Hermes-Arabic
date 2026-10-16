package com.hoodmoshla.hermesarabic;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.lang.ref.WeakReference;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

/** GitHub REST integration. Tokens never leave native code or Android Keystore-backed storage. */
public final class GitHubConnector {
    private static final String TAG = "HermesGitHub";
    private static final String API = "https://api.github.com";
    private static final String TOKEN_ALIAS = "hermes_github_pat_v1";
    private static final String TOKEN_PREF = "github_pat";
    private static final String PREFS = "hermes-github-v1";
    private static final String PROPOSAL_DIR = "github-proposals";
    private static final int MAX_RESPONSE_BYTES = 12 * 1024 * 1024;
    private static final int MAX_FILE_BYTES = 2 * 1024 * 1024;
    private static final int MAX_PROPOSAL_BYTES = 5 * 1024 * 1024;
    private static final MediaType JSON_TYPE = MediaType.parse("application/json; charset=utf-8");
    private static final OkHttpClient HTTP = new OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(35, TimeUnit.SECONDS)
            .followRedirects(false)
            .followSslRedirects(false)
            .build();
    private static volatile Context appContext;
    private static volatile WeakReference<MainActivity> activityRef = new WeakReference<>(null);

    private GitHubConnector() {}

    public static void initialize(Context context, MainActivity activity) {
        if (context != null) appContext = context.getApplicationContext();
        activityRef = new WeakReference<>(activity);
    }

    public static void setForegroundActivity(MainActivity activity) {
        activityRef = new WeakReference<>(activity);
    }

    public static boolean isConnected() {
        try { return !token().isEmpty(); } catch (Exception ignored) { return false; }
    }

    public static String statusJson() {
        Context context = appContext;
        if (context == null) return jsonError("GitHub connector is not initialized");
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        boolean connected = isConnected();
        JSONObject result = new JSONObject();
        try {
            result.put("ok", true);
            result.put("connected", connected);
            result.put("login", connected ? prefs.getString("login", "GitHub account") : "");
            result.put("token_permissions", connected ? prefs.getString("permissions", "") : "");
            result.put("pending_proposals", listProposalFiles().length);
        } catch (Exception ignored) {}
        return result.toString();
    }

    public static String connect(String pat) {
        try {
            String value = pat == null ? "" : pat.trim();
            if (value.length() < 20 || value.indexOf('\n') >= 0 || value.indexOf('\r') >= 0) {
                return jsonError("أدخل GitHub Personal Access Token صالحًا؛ لا نحتفظ به إلا بعد التحقق.");
            }
            ApiResponse response = request("GET", "/user", null, value);
            JSONObject user = requireJson(response, 200);
            String login = user.optString("login", "");
            if (login.isEmpty()) return jsonError("GitHub لم يُرجع حسابًا صالحًا لهذا الرمز.");
            AndroidSecretStore.put(context(), TOKEN_ALIAS, TOKEN_PREF, value);
            SharedPreferences.Editor editor = context().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
            editor.putString("login", login);
            editor.putString("permissions", response.scopes == null || response.scopes.isEmpty()
                    ? "fine-grained token" : response.scopes);
            editor.apply();
            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("connected", true);
            result.put("login", login);
            result.put("message", "تم التحقق من الرمز وتخزينه مشفرًا في Android Keystore.");
            return result.toString();
        } catch (Exception error) {
            Log.w(TAG, "GitHub token verification failed (secret omitted)");
            return jsonError("تعذر التحقق من الرمز. تأكد من صلاحيته وإمكانية الوصول إلى GitHub.");
        }
    }

    public static String disconnect() {
        try {
            AndroidSecretStore.remove(context(), TOKEN_PREF);
            context().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply();
            return "{\"ok\":true,\"connected\":false}";
        } catch (Exception error) {
            return jsonError("تعذر فصل GitHub.");
        }
    }

    public static String listRepositories() {
        try {
            String accessToken = tokenRequired();
            JSONArray repositories = new JSONArray();
            for (int page = 1; page <= 10; page++) {
                JSONArray batch = requireArray(request("GET", "/user/repos?per_page=100&sort=updated&affiliation=owner%2Ccollaborator%2Corganization_member&page=" + page, null, accessToken), 200);
                for (int i = 0; i < batch.length(); i++) {
                    JSONObject repo = batch.optJSONObject(i);
                    if (repo == null) continue;
                    JSONObject row = new JSONObject();
                    row.put("full_name", repo.optString("full_name", ""));
                    row.put("name", repo.optString("name", ""));
                    row.put("description", repo.optString("description", ""));
                    row.put("private", repo.optBoolean("private", false));
                    row.put("default_branch", repo.optString("default_branch", "main"));
                    row.put("updated_at", repo.optString("updated_at", ""));
                    JSONObject permissions = repo.optJSONObject("permissions");
                    row.put("can_push", permissions != null && permissions.optBoolean("push", false));
                    repositories.put(row);
                }
                if (batch.length() < 100 || repositories.length() >= 1000) break;
            }
            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("repositories", repositories);
            return result.toString();
        } catch (Exception error) {
            return jsonError(publicError(error));
        }
    }

    public static String listTree(String repository, String reference) {
        try {
            String repo = validateRepository(repository);
            String ref = validateRef(reference);
            String accessToken = tokenRequired();
            String commitSha;
            if (ref.matches("(?i)[0-9a-f]{40}")) {
                commitSha = ref;
            } else {
                JSONObject branch = requireJson(request("GET", "/repos/" + repo + "/branches/" + encodePath(ref), null, accessToken), 200);
                commitSha = branch.optJSONObject("commit").optString("sha", "");
            }
            if (commitSha.isEmpty()) throw new IllegalStateException("Could not resolve the GitHub reference");
            JSONObject commit = requireJson(request("GET", "/repos/" + repo + "/git/commits/" + commitSha, null, accessToken), 200);
            String treeSha = commit.optJSONObject("tree").optString("sha", "");
            if (treeSha.isEmpty()) throw new IllegalStateException("Could not resolve the repository tree");
            JSONObject tree = requireJson(request("GET", "/repos/" + repo + "/git/trees/" + treeSha + "?recursive=1", null, accessToken), 200);
            JSONArray source = tree.optJSONArray("tree");
            JSONArray files = new JSONArray();
            if (source != null) for (int i = 0; i < source.length() && files.length() < 3000; i++) {
                JSONObject entry = source.optJSONObject(i);
                if (entry == null || !"blob".equals(entry.optString("type"))) continue;
                JSONObject item = new JSONObject();
                item.put("path", entry.optString("path", ""));
                item.put("sha", entry.optString("sha", ""));
                item.put("size", entry.optLong("size", 0));
                item.put("mode", entry.optString("mode", "100644"));
                files.put(item);
            }
            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("repository", repo);
            result.put("reference", ref);
            result.put("truncated", tree.optBoolean("truncated", false));
            result.put("files", files);
            return result.toString();
        } catch (Exception error) {
            return jsonError(publicError(error));
        }
    }

    public static String readFile(String repository, String path, String reference) {
        try {
            String repo = validateRepository(repository);
            String safePath = validatePath(path);
            String ref = validateRef(reference);
            String accessToken = tokenRequired();
            FileData file = fetchFile(accessToken, repo, safePath, ref);
            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("repository", repo);
            result.put("path", safePath);
            result.put("reference", ref);
            result.put("sha", file.sha);
            result.put("content", file.content);
            return result.toString();
        } catch (Exception error) {
            return jsonError(publicError(error));
        }
    }

    public static String createUploadProposal(String repository, String branch, String changesJson, String commitMessage) {
        try {
            String repo = validateRepository(repository);
            String ref = validateRef(branch);
            String message = (commitMessage == null ? "" : commitMessage.trim());
            if (message.isEmpty()) message = "Update from Hermes Arabic";
            if (message.length() > 180) throw new IllegalArgumentException("Commit message is too long");
            JSONArray changes = new JSONArray(changesJson == null ? "[]" : changesJson);
            if (changes.length() == 0 || changes.length() > 30) throw new IllegalArgumentException("Proposal must contain 1–30 file changes");
            String accessToken = tokenRequired();
            JSONObject repoMetadata = requireJson(request("GET", "/repos/" + repo, null, accessToken), 200);
            String defaultBranch = repoMetadata.optString("default_branch", "");
            String sourceRef = ref;
            boolean createBranch = !defaultBranch.isEmpty() && defaultBranch.equals(ref);
            String id = UUID.randomUUID().toString();
            if (createBranch) ref = "hermes/" + System.currentTimeMillis() + "-" + id.substring(0, 8);
            String branchPath = "/repos/" + repo + "/branches/" + encodePath(ref);
            JSONObject branchData = createBranch
                    ? requireJson(request("GET", "/repos/" + repo + "/branches/" + encodePath(sourceRef), null, accessToken), 200)
                    : requireJson(request("GET", branchPath, null, accessToken), 200);
            String baseSha = branchData.optJSONObject("commit").optString("sha", "");
            if (baseSha.isEmpty()) throw new IllegalStateException("Could not resolve the target branch");
            JSONObject commit = requireJson(request("GET", "/repos/" + repo + "/git/commits/" + baseSha, null, accessToken), 200);
            String treeSha = commit.optJSONObject("tree").optString("sha", "");
            if (treeSha.isEmpty()) throw new IllegalStateException("Could not inspect the current branch tree");
            JSONObject tree = requireJson(request("GET", "/repos/" + repo + "/git/trees/" + treeSha + "?recursive=1", null, accessToken), 200);
            JSONArray treeEntries = tree.optJSONArray("tree");
            JSONObject modes = new JSONObject();
            if (treeEntries != null) for (int i = 0; i < treeEntries.length(); i++) {
                JSONObject entry = treeEntries.optJSONObject(i);
                if (entry != null && "blob".equals(entry.optString("type"))) modes.put(entry.optString("path"), entry.optString("mode", "100644"));
            }

            JSONArray normalizedChanges = new JSONArray();
            StringBuilder preview = new StringBuilder();
            long totalBytes = 0;
            for (int i = 0; i < changes.length(); i++) {
                JSONObject change = changes.optJSONObject(i);
                if (change == null) throw new IllegalArgumentException("Invalid file change");
                String path = validatePath(change.optString("path", ""));
                boolean delete = change.optBoolean("delete", false);
                String content = delete ? "" : change.optString("content", "");
                byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
                if (bytes.length > MAX_FILE_BYTES) throw new IllegalArgumentException("Files larger than 2 MiB must be changed in smaller chunks");
                totalBytes += bytes.length;
                if (totalBytes > MAX_PROPOSAL_BYTES) throw new IllegalArgumentException("Total proposal is larger than 5 MiB");
                String mode = modes.optString(path, "100644");
                JSONObject item = new JSONObject();
                item.put("path", path);
                item.put("delete", delete);
                item.put("content", content);
                item.put("mode", mode);
                normalizedChanges.put(item);
                preview.append(delete ? "− " : (modes.has(path) ? "± " : "+ ")).append(path).append('\n');
                if (preview.length() < 5200) {
                    if (!delete) preview.append("  + ").append(firstLine(content)).append('\n');
                    else preview.append("  (حذف الملف)\n");
                }
            }
            JSONObject proposal = new JSONObject();
            proposal.put("id", id);
            proposal.put("kind", "commit");
            proposal.put("repository", repo);
            proposal.put("branch", ref);
            proposal.put("source_branch", sourceRef);
            proposal.put("create_branch", createBranch);
            proposal.put("base_sha", baseSha);
            proposal.put("commit_message", message);
            proposal.put("changes", normalizedChanges);
            proposal.put("preview", preview.toString());
            proposal.put("created_at", System.currentTimeMillis());
            writeProposal(id, proposal);
            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("proposal_id", id);
            result.put("repository", repo);
            result.put("branch", ref);
            result.put("source_branch", sourceRef);
            result.put("base_sha", baseSha);
            result.put("commit_message", message);
            result.put("files", preview.toString());
            result.put("file_count", normalizedChanges.length());
            result.put("requires_user_approval", true);
            result.put("message", "لم تُرفع أي تغييرات. اعرض المقترح في التطبيق ووافق عليه قبل الرفع.");
            return result.toString();
        } catch (Exception error) {
            return jsonError(publicError(error));
        }
    }

    public static String listPendingProposals() {
        JSONArray result = new JSONArray();
        try {
            for (File file : listProposalFiles()) {
                try (FileInputStream input = new FileInputStream(file)) {
                    JSONObject proposal = new JSONObject(readUtf8(input, MAX_PROPOSAL_BYTES + 100_000));
                    JSONObject row = new JSONObject();
                    row.put("id", proposal.optString("id"));
                    row.put("kind", proposal.optString("kind"));
                    row.put("repository", proposal.optString("repository"));
                    row.put("branch", proposal.optString("branch"));
                    row.put("commit_message", proposal.optString("commit_message"));
                    row.put("preview", proposal.optString("preview"));
                    row.put("changes", proposal.optJSONArray("changes") == null ? new JSONArray() : proposal.optJSONArray("changes"));
                    row.put("source_branch", proposal.optString("source_branch", ""));
                    row.put("create_branch", proposal.optBoolean("create_branch", false));
                    row.put("created_at", proposal.optLong("created_at"));
                    row.put("file_count", proposal.optJSONArray("changes") == null ? 0 : proposal.optJSONArray("changes").length());
                    row.put("workflow_id", proposal.optString("workflow_id", ""));
                    row.put("workflow_name", proposal.optString("workflow_name", ""));
                    row.put("inputs", proposal.optJSONObject("inputs") == null ? new JSONObject() : proposal.optJSONObject("inputs"));
                    result.put(row);
                }
            }
            JSONObject response = new JSONObject();
            response.put("ok", true);
            response.put("proposals", result);
            return response.toString();
        } catch (Exception error) {
            return jsonError("تعذر تحميل مقترحات GitHub المحفوظة.");
        }
    }

    public static String approveProposal(String proposalId) {
        try {
            String id = validateProposalId(proposalId);
            JSONObject proposal = readProposal(id);
            MainActivity activity = activityRef.get();
            if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
                return jsonError("المقترح محفوظ، لكن افتح التطبيق للموافقة على الرفع.");
            }
            AtomicBoolean approved = new AtomicBoolean(false);
            CountDownLatch latch = new CountDownLatch(1);
            String message = buildApprovalText(proposal);
            activity.runOnUiThread(() -> {
                try {
                    new AlertDialog.Builder(activity)
                            .setTitle("موافقة على إجراء GitHub")
                            .setMessage(message)
                            .setPositiveButton("workflow_dispatch".equals(proposal.optString("kind")) ? "أوافق على تشغيل الاختبارات" : "أوافق على الرفع", (dialog, which) -> { approved.set(true); latch.countDown(); })
                            .setNegativeButton("إلغاء", (dialog, which) -> latch.countDown())
                            .setOnCancelListener(dialog -> latch.countDown())
                            .show();
                } catch (Exception error) {
                    latch.countDown();
                }
            });
            if (!latch.await(120, TimeUnit.SECONDS)) return jsonError("انتهت مهلة الموافقة؛ لم تُرفع أي تغييرات.");
            if (!approved.get()) return jsonError("أُلغي الرفع؛ لم تُرفع أي تغييرات.");
            String result = "workflow_dispatch".equals(proposal.optString("kind"))
                    ? dispatchWorkflow(proposal) : uploadProposal(proposal);
            File file = proposalFile(id);
            if (new JSONObject(result).optBoolean("ok", false)) file.delete();
            return result;
        } catch (Exception error) {
            return jsonError(publicError(error));
        }
    }

    public static String discardProposal(String proposalId) {
        try {
            String id = validateProposalId(proposalId);
            File file = proposalFile(id);
            boolean removed = !file.exists() || file.delete();
            return new JSONObject().put("ok", removed).put("discarded", removed).toString();
        } catch (Exception error) {
            return jsonError("تعذر حذف المقترح.");
        }
    }

    public static String listWorkflowRuns(String repository, String branch) {
        try {
            String repo = validateRepository(repository);
            String ref = validateRef(branch);
            JSONObject response = requireJson(request("GET", "/repos/" + repo + "/actions/runs?branch=" + encodeQuery(ref) + "&per_page=20", null, tokenRequired()), 200);
            JSONArray runs = response.optJSONArray("workflow_runs");
            JSONArray resultRuns = new JSONArray();
            if (runs != null) for (int i = 0; i < runs.length(); i++) {
                JSONObject run = runs.optJSONObject(i);
                if (run == null) continue;
                JSONObject item = new JSONObject();
                item.put("id", run.optLong("id"));
                item.put("name", run.optString("name", ""));
                item.put("event", run.optString("event", ""));
                item.put("status", run.optString("status", ""));
                item.put("conclusion", run.optString("conclusion", ""));
                item.put("html_url", run.optString("html_url", ""));
                item.put("created_at", run.optString("created_at", ""));
                item.put("head_branch", run.optString("head_branch", ""));
                resultRuns.put(item);
            }
            return new JSONObject().put("ok", true).put("runs", resultRuns).toString();
        } catch (Exception error) {
            return jsonError(publicError(error));
        }
    }

    public static String listWorkflows(String repository) {
        try {
            String repo = validateRepository(repository);
            JSONObject response = requireJson(request("GET", "/repos/" + repo + "/actions/workflows?per_page=100", null, tokenRequired()), 200);
            JSONArray source = response.optJSONArray("workflows");
            JSONArray result = new JSONArray();
            if (source != null) for (int i = 0; i < source.length(); i++) {
                JSONObject workflow = source.optJSONObject(i);
                if (workflow == null) continue;
                result.put(new JSONObject().put("id", workflow.optLong("id"))
                        .put("name", workflow.optString("name", ""))
                        .put("path", workflow.optString("path", ""))
                        .put("state", workflow.optString("state", ""))
                        .put("url", workflow.optString("html_url", "")));
            }
            return new JSONObject().put("ok", true).put("workflows", result).toString();
        } catch (Exception error) {
            return jsonError(publicError(error));
        }
    }

    public static String createWorkflowRunProposal(String repository, String workflowId, String branch, String inputsJson) {
        try {
            String repo = validateRepository(repository);
            String safeWorkflowId = validateWorkflowId(workflowId);
            String ref = validateWorkflowBranch(branch);
            String accessToken = tokenRequired();
            JSONObject workflow = requireJson(request("GET", "/repos/" + repo + "/actions/workflows/" + encodePath(safeWorkflowId), null, accessToken), 200);
            if (!"active".equals(workflow.optString("state", ""))) throw new IllegalStateException("هذا workflow غير نشط في GitHub.");
            JSONObject branchData = requireJson(request("GET", "/repos/" + repo + "/branches/" + encodePath(ref), null, accessToken), 200);
            String baseSha = branchData.optJSONObject("commit").optString("sha", "");
            if (baseSha.isEmpty()) throw new IllegalStateException("تعذر قراءة SHA الفرع المطلوب.");
            JSONObject inputs = new JSONObject(inputsJson == null || inputsJson.trim().isEmpty() ? "{}" : inputsJson);
            if (inputs.length() > 10) throw new IllegalArgumentException("يدعم workflow_dispatch حتى 10 مدخلات.");
            java.util.Iterator<String> keys = inputs.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                Object value = inputs.opt(key);
                if (!key.matches("[A-Za-z0-9_-]{1,100}") || value == null || value == JSONObject.NULL || String.valueOf(value).length() > 1000) {
                    throw new IllegalArgumentException("مدخل workflow غير صالح أو طويل.");
                }
                inputs.put(key, String.valueOf(value));
            }
            String id = UUID.randomUUID().toString();
            String name = workflow.optString("name", safeWorkflowId);
            JSONObject proposal = new JSONObject();
            proposal.put("id", id);
            proposal.put("kind", "workflow_dispatch");
            proposal.put("repository", repo);
            proposal.put("workflow_id", safeWorkflowId);
            proposal.put("workflow_name", name);
            proposal.put("branch", ref);
            proposal.put("base_sha", baseSha);
            proposal.put("inputs", inputs);
            proposal.put("preview", "تشغيل " + name + " (" + workflow.optString("path", safeWorkflowId) + ") على " + ref + " @ " + baseSha.substring(0, 8));
            proposal.put("created_at", System.currentTimeMillis());
            writeProposal(id, proposal);
            return new JSONObject().put("ok", true).put("proposal_id", id).put("repository", repo)
                    .put("workflow_id", safeWorkflowId).put("workflow_name", name).put("branch", ref)
                    .put("base_sha", baseSha).put("inputs", inputs).put("requires_user_approval", true)
                    .put("message", "لم يُشغّل workflow؛ اعرض المقترح ووافق عليه داخل التطبيق.").toString();
        } catch (Exception error) {
            return jsonError(publicError(error));
        }
    }

    /** Agent tools use these methods, but cannot bypass the proposal-and-native-confirmation path. */
    public static String agentListRepositories() { return listRepositories(); }
    public static String agentListTree(String repository, String reference) { return listTree(repository, reference); }
    public static String agentReadFile(String repository, String path, String reference) { return readFile(repository, path, reference); }
    public static String agentProposeChanges(String repository, String branch, String changesJson, String message) {
        return createUploadProposal(repository, branch, changesJson, message);
    }
    public static String agentListWorkflowRuns(String repository, String branch) { return listWorkflowRuns(repository, branch); }
    public static String agentListWorkflows(String repository) { return listWorkflows(repository); }
    public static String agentProposeWorkflowRun(String repository, String workflowId, String branch, String inputsJson) {
        return createWorkflowRunProposal(repository, workflowId, branch, inputsJson);
    }

    private static String dispatchWorkflow(JSONObject proposal) throws Exception {
        String repo = validateRepository(proposal.optString("repository"));
        String workflowId = validateWorkflowId(proposal.optString("workflow_id"));
        String branch = validateWorkflowBranch(proposal.optString("branch"));
        String baseSha = proposal.optString("base_sha", "");
        String accessToken = tokenRequired();
        String currentSha = requireJson(request("GET", "/repos/" + repo + "/branches/" + encodePath(branch), null, accessToken), 200)
                .optJSONObject("commit").optString("sha", "");
        if (!baseSha.equals(currentSha)) throw new IllegalStateException("تغيّر الفرع منذ إعداد طلب الاختبار؛ راجعه وأنشئ طلبًا جديدًا.");
        JSONObject body = new JSONObject().put("ref", branch)
                .put("inputs", proposal.optJSONObject("inputs") == null ? new JSONObject() : proposal.optJSONObject("inputs"));
        ApiResponse response = request("POST", "/repos/" + repo + "/actions/workflows/" + encodePath(workflowId) + "/dispatches", body, accessToken);
        if (response.status != 204) throw new GitHubApiException(response.status, "GitHub workflow dispatch HTTP " + response.status);
        return new JSONObject().put("ok", true).put("repository", repo).put("workflow", proposal.optString("workflow_name"))
                .put("branch", branch).put("base_sha", baseSha).put("message", "أرسل GitHub طلب تشغيل workflow بعد موافقتك.").toString();
    }

    private static String uploadProposal(JSONObject proposal) throws Exception {
        String accessToken = tokenRequired();
        String repo = validateRepository(proposal.optString("repository"));
        String branch = validateRef(proposal.optString("branch"));
        String baseSha = proposal.optString("base_sha", "");
        if (proposal.optBoolean("create_branch", false)) {
            String sourceBranch = validateRef(proposal.optString("source_branch"));
            String currentSourceSha = requireJson(request("GET", "/repos/" + repo + "/branches/" + encodePath(sourceBranch), null, accessToken), 200)
                    .optJSONObject("commit").optString("sha", "");
            if (!baseSha.equals(currentSourceSha)) throw new IllegalStateException("تغيّر الفرع المصدر منذ إعداد المقترح؛ أنشئ مقترحًا جديدًا بعد مراجعة التغييرات الحالية.");
            JSONObject createRef = new JSONObject().put("ref", "refs/heads/" + branch).put("sha", baseSha);
            requireJson(request("POST", "/repos/" + repo + "/git/refs", createRef, accessToken), 201);
        } else {
            String currentSha = requireJson(request("GET", "/repos/" + repo + "/branches/" + encodePath(branch), null, accessToken), 200)
                    .optJSONObject("commit").optString("sha", "");
            if (!baseSha.equals(currentSha)) throw new IllegalStateException("تغيّر الفرع منذ إعداد المقترح؛ أنشئ مقترحًا جديدًا بعد مراجعة التغييرات الحالية.");
        }
        JSONObject baseCommit = requireJson(request("GET", "/repos/" + repo + "/git/commits/" + baseSha, null, accessToken), 200);
        String baseTree = baseCommit.optJSONObject("tree").optString("sha", "");
        JSONArray changes = proposal.optJSONArray("changes");
        if (changes == null || changes.length() == 0) throw new IllegalArgumentException("المقترح فارغ");
        JSONArray treeEntries = new JSONArray();
        for (int i = 0; i < changes.length(); i++) {
            JSONObject change = changes.getJSONObject(i);
            String path = validatePath(change.optString("path"));
            boolean delete = change.optBoolean("delete", false);
            JSONObject entry = new JSONObject();
            entry.put("path", path);
            entry.put("mode", change.optString("mode", "100644"));
            entry.put("type", "blob");
            if (delete) entry.put("sha", JSONObject.NULL);
            else {
                byte[] bytes = change.optString("content", "").getBytes(StandardCharsets.UTF_8);
                JSONObject blob = requireJson(request("POST", "/repos/" + repo + "/git/blobs",
                        new JSONObject().put("content", Base64.encodeToString(bytes, Base64.NO_WRAP)).put("encoding", "base64"), accessToken), 201);
                entry.put("sha", blob.optString("sha", ""));
            }
            treeEntries.put(entry);
        }
        JSONObject treeBody = new JSONObject().put("base_tree", baseTree).put("tree", treeEntries);
        JSONObject newTree = requireJson(request("POST", "/repos/" + repo + "/git/trees", treeBody, accessToken), 201);
        JSONArray parents = new JSONArray().put(baseSha);
        JSONObject commitBody = new JSONObject().put("message", proposal.optString("commit_message"))
                .put("tree", newTree.optString("sha")).put("parents", parents);
        JSONObject newCommit = requireJson(request("POST", "/repos/" + repo + "/git/commits", commitBody, accessToken), 201);
        String commitSha = newCommit.optString("sha", "");
        JSONObject updateRef = new JSONObject().put("sha", commitSha).put("force", false);
        requireJson(request("PATCH", "/repos/" + repo + "/git/refs/heads/" + encodePath(branch), updateRef, accessToken), 200);
        return new JSONObject().put("ok", true).put("repository", repo).put("branch", branch)
                .put("commit_sha", commitSha).put("html_url", "https://github.com/" + repo + "/commit/" + commitSha)
                .put("message", "تم رفع commit واحد بعد موافقتك الصريحة.").toString();
    }

    private static String buildApprovalText(JSONObject proposal) {
        StringBuilder text = new StringBuilder();
        text.append("المستودع: ").append(proposal.optString("repository")).append('\n');
        if ("workflow_dispatch".equals(proposal.optString("kind"))) {
            text.append("العملية: تشغيل GitHub Actions\n");
            text.append("Workflow: ").append(proposal.optString("workflow_name")).append(" (").append(proposal.optString("workflow_id")).append(")\n");
            text.append("الفرع: ").append(proposal.optString("branch")).append(" @ ").append(proposal.optString("base_sha")).append('\n');
            text.append("المدخلات: ").append(proposal.optJSONObject("inputs") == null ? "{}" : proposal.optJSONObject("inputs").toString()).append('\n');
            text.append("قد يستهلك التشغيل دقائق Actions؛ لن يُشغّل إلا بعد موافقتك.");
            return text.toString();
        }
        text.append("الفرع: ").append(proposal.optString("branch")).append('\n');
        if (proposal.optBoolean("create_branch", false)) text.append("فرع المصدر: ").append(proposal.optString("source_branch")).append(" (سيُنشأ فرع مراجعة جديد)\n");
        text.append("رسالة commit: ").append(proposal.optString("commit_message")).append('\n');
        text.append("الملفات والتغييرات المقترحة:\n").append(proposal.optString("preview"));
        text.append("\nلن يُرفع شيء إلا إذا اخترت «أوافق على الرفع». يُرفض المقترح تلقائيًا إذا تغيّر الفرع منذ مراجعته.");
        if (text.length() > 6500) return text.substring(0, 6500) + "\n… (يُعرض باقي الملخص في صفحة المقترحات داخل التطبيق)";
        return text.toString();
    }

    private static FileData fetchFile(String accessToken, String repo, String path, String ref) throws Exception {
        ApiResponse response = request("GET", "/repos/" + repo + "/contents/" + encodePath(path) + "?ref=" + encodeQuery(ref), null, accessToken);
        JSONObject file = requireJson(response, 200);
        if (!"base64".equals(file.optString("encoding"))) throw new IllegalStateException("GitHub returned a non-text file");
        String encoded = file.optString("content", "").replace("\n", "").replace("\r", "");
        byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
        if (bytes.length > MAX_FILE_BYTES) throw new IllegalArgumentException("Files larger than 2 MiB are not supported by the mobile editor");
        return new FileData(file.optString("sha", ""), new String(bytes, StandardCharsets.UTF_8));
    }

    private static ApiResponse request(String method, String path, JSONObject body, String accessToken) throws Exception {
        if (path.startsWith("//") || path.contains("\r") || path.contains("\n")) throw new IllegalArgumentException("Invalid GitHub API path");
        okhttp3.HttpUrl parsedUrl = okhttp3.HttpUrl.parse(API + path);
        if (parsedUrl == null || !"api.github.com".equals(parsedUrl.host()) || !"https".equals(parsedUrl.scheme())) {
            throw new IllegalArgumentException("GitHub API host is not trusted");
        }
        RequestBody requestBody = body == null ? null : RequestBody.create(JSON_TYPE, body.toString());
        Request.Builder builder = new Request.Builder().url(parsedUrl)
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .header("User-Agent", "Hermes-Arabic-Android/0.2");
        if (accessToken != null && !accessToken.isEmpty()) builder.header("Authorization", "Bearer " + accessToken);
        builder.method(method, requestBody);
        try (Response response = HTTP.newCall(builder.build()).execute()) {
            ResponseBody responseBody = response.body();
            String responseText = responseBody == null ? "" : readUtf8(responseBody.byteStream(), MAX_RESPONSE_BYTES);
            return new ApiResponse(response.code(), responseText, response.header("X-OAuth-Scopes"));
        }
    }

    private static JSONArray requireArray(ApiResponse response, int expectedStatus) throws Exception {
        if (response.status != expectedStatus) throw new GitHubApiException(response.status, "GitHub HTTP " + response.status);
        return new JSONArray(response.body);
    }

    private static JSONObject requireJson(ApiResponse response, int expectedStatus) throws Exception {
        if (response.status != expectedStatus) {
            String reason = "GitHub HTTP " + response.status;
            try {
                JSONObject error = new JSONObject(response.body);
                String message = error.optString("message", "");
                if (message.length() > 180) message = message.substring(0, 180);
                if (!message.isEmpty()) reason += ": " + message;
            } catch (Exception ignored) {}
            throw new GitHubApiException(response.status, reason);
        }
        return response.body.isEmpty() ? new JSONObject() : new JSONObject(response.body);
    }

    private static String token() throws Exception {
        Context context = appContext;
        if (context == null) return "";
        return AndroidSecretStore.get(context, TOKEN_ALIAS, TOKEN_PREF);
    }
    private static String tokenRequired() throws Exception {
        String value = token();
        if (value.isEmpty()) throw new IllegalStateException("اربط حساب GitHub من صفحة الإعدادات أولًا.");
        return value;
    }
    private static Context context() {
        Context value = appContext;
        if (value == null) throw new IllegalStateException("GitHub connector is not initialized");
        return value;
    }

    private static String validateRepository(String value) {
        String repo = value == null ? "" : value.trim();
        if (!repo.matches("[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}")) throw new IllegalArgumentException("Repository must be in owner/name format");
        return repo;
    }
    private static String validateRef(String value) {
        String ref = value == null ? "" : value.trim();
        if (ref.isEmpty() || ref.length() > 180 || ref.startsWith("-") || ref.contains("..") || ref.contains("\\") || ref.contains("\n")) throw new IllegalArgumentException("Invalid branch or ref");
        return ref;
    }
    private static String validateWorkflowId(String value) {
        String id = value == null ? "" : value.trim();
        if (!id.matches("[0-9]{1,20}|[A-Za-z0-9_.-]{1,100}\\.ya?ml")) throw new IllegalArgumentException("أدخل رقم workflow أو اسم ملف YAML صالحًا.");
        return id;
    }
    private static String validateWorkflowBranch(String value) {
        String branch = validateRef(value);
        if (branch.matches("(?i)[0-9a-f]{40}")) throw new IllegalArgumentException("تشغيل workflow يتطلب اسم فرع، لا SHA commit.");
        return branch;
    }
    private static String validatePath(String value) {
        String path = value == null ? "" : value.trim();
        if (path.isEmpty() || path.length() > 512 || path.startsWith("/") || path.contains("\\") || path.contains("\n") || path.contains("\r")) throw new IllegalArgumentException("Invalid repository path");
        for (String segment : path.split("/")) if (segment.isEmpty() || ".".equals(segment) || "..".equals(segment) || ".git".equalsIgnoreCase(segment)) throw new IllegalArgumentException("Unsafe repository path");
        return path;
    }
    private static String validateProposalId(String value) {
        String id = value == null ? "" : value.trim();
        if (!id.matches("[0-9a-fA-F-]{36}")) throw new IllegalArgumentException("Invalid proposal id");
        return id;
    }
    private static String encodePath(String path) throws Exception {
        String[] parts = path.split("/", -1);
        StringBuilder result = new StringBuilder();
        for (String part : parts) {
            if (result.length() > 0) result.append('/');
            result.append(URLEncoder.encode(part, "UTF-8").replace("+", "%20"));
        }
        return result.toString();
    }
    private static String encodeQuery(String value) throws Exception { return URLEncoder.encode(value, "UTF-8").replace("+", "%20"); }
    private static String firstLine(String value) {
        String text = value == null ? "" : value.replace("\r", "");
        int newline = text.indexOf('\n');
        if (newline >= 0) text = text.substring(0, newline);
        return text.length() > 300 ? text.substring(0, 300) + "…" : text;
    }

    private static File proposalDirectory() {
        File dir = new File(context().getNoBackupFilesDir(), PROPOSAL_DIR);
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IllegalStateException("Cannot create private proposal directory");
        return dir;
    }
    private static File proposalFile(String id) { return new File(proposalDirectory(), id + ".json"); }
    private static File[] listProposalFiles() {
        File dir = proposalDirectory();
        File[] files = dir.listFiles((parent, name) -> name.matches("[0-9a-fA-F-]{36}\\.json"));
        return files == null ? new File[0] : files;
    }
    private static void writeProposal(String id, JSONObject proposal) throws Exception {
        try (FileOutputStream output = new FileOutputStream(proposalFile(id))) {
            output.write(proposal.toString().getBytes(StandardCharsets.UTF_8));
            output.getFD().sync();
        }
    }
    private static JSONObject readProposal(String id) throws Exception {
        File file = proposalFile(id);
        if (!file.isFile() || System.currentTimeMillis() - file.lastModified() > TimeUnit.HOURS.toMillis(24)) throw new IllegalStateException("GitHub proposal expired or no longer exists");
        try (FileInputStream input = new FileInputStream(file)) { return new JSONObject(readUtf8(input, MAX_PROPOSAL_BYTES + 100_000)); }
    }
    private static String readUtf8(InputStream input, int maxBytes) throws Exception {
        try (InputStream in = input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[32 * 1024];
            int count;
            int total = 0;
            while ((count = in.read(buffer)) != -1) {
                total += count;
                if (total > maxBytes) throw new IllegalArgumentException("Response exceeds the mobile size limit");
                output.write(buffer, 0, count);
            }
            return output.toString("UTF-8");
        }
    }
    private static String publicError(Exception error) {
        if (error instanceof GitHubApiException) return error.getMessage();
        String message = error.getMessage();
        if (message != null && !message.isEmpty() && !message.contains("ghp_") && !message.contains("github_pat_")) return message;
        return "GitHub request failed (" + error.getClass().getSimpleName() + ")";
    }
    private static String jsonError(String message) {
        try { return new JSONObject().put("ok", false).put("error", message == null ? "GitHub error" : message).toString(); }
        catch (Exception ignored) { return "{\"ok\":false,\"error\":\"GitHub error\"}"; }
    }

    private static final class FileData {
        final String sha;
        final String content;
        FileData(String sha, String content) { this.sha = sha; this.content = content; }
    }
    private static final class ApiResponse {
        final int status;
        final String body;
        final String scopes;
        ApiResponse(int status, String body, String scopes) {
            this.status = status;
            this.body = body;
            this.scopes = scopes;
        }
    }
    private static final class GitHubApiException extends Exception {
        final int status;
        GitHubApiException(int status, String message) { super(message); this.status = status; }
    }
}
