package com.leetcodeanalyser;

import com.leetcodeanalyser.model.SolvedProblem;
import com.leetcodeanalyser.model.UserStats;
import com.leetcodeanalyser.service.AnalyticsResponse;
import com.leetcodeanalyser.service.GeminiService;
import com.leetcodeanalyser.service.LeetCodeService;
import com.leetcodeanalyser.service.ListAnalysisResponse;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
public class TestController {

    private final LeetCodeService leetCodeService;

    @Autowired
    private GeminiService geminiService;

    public TestController(LeetCodeService leetCodeService) {
        this.leetCodeService = leetCodeService;
    }

    // ──── Existing username-based endpoints ────

    @GetMapping("/stats/{username}")
    public UserStats getStats(@PathVariable("username") String username) {
        return leetCodeService.getUserStats(username);
    }

    @GetMapping("/tags/{slug}")
    public String getProblemTags(@PathVariable("slug") String slug) {
        return leetCodeService.getProblemTags(slug);
    }

    @GetMapping("/patterns/{username}")
    public AnalyticsResponse getPatterns(@PathVariable("username") String username) {
        return leetCodeService.getPatternCounts(username);
    }

    @GetMapping("/recommendation/{username}")
    public Map<String, Object> getRecommendation(@PathVariable("username") String username) {
        return leetCodeService.getRecommendation(username);
    }

    // ──── Existing chat (pattern counts only) ────

    @PostMapping("/chat")
    public Map<String, String> chatWithAi(@RequestBody Map<String, Object> payload) {
        String message = (String) payload.get("message");

        // Check if full categorized summary is available (list-based flow)
        if (payload.containsKey("categorizedSummary")) {
            String categorizedSummary = (String) payload.get("categorizedSummary");
            String reply = geminiService.getAiAdviceWithProblems(message, categorizedSummary);
            return Map.of("reply", reply);
        }

        // Fallback: old pattern-counts flow
        @SuppressWarnings("unchecked")
        Map<String, Integer> patterns = (Map<String, Integer>) payload.get("patterns");
        String reply = geminiService.getAiAdvice(message, patterns);
        return Map.of("reply", reply);
    }

    // ──── NEW: AI Study Plan ────

    @PostMapping("/study-plan")
    public Map<String, String> generateStudyPlan(@RequestBody Map<String, String> payload) {
        String categorizedSummary = payload.get("categorizedSummary");
        String plan = geminiService.generateStudyPlan(categorizedSummary);
        return Map.of("plan", plan);
    }

    // ──── NEW: Public list analysis ────

    /**
     * Analyzes a LeetCode public list by its slug.
     * URL format: /analyze-list/w3t3sfpm
     * Extracted from: https://leetcode.com/problem-list/w3t3sfpm/
     */
    @GetMapping("/analyze-list/{slug}")
    public ListAnalysisResponse analyzeList(@PathVariable("slug") String slug) {
        return leetCodeService.analyzeList(slug);
    }
}
