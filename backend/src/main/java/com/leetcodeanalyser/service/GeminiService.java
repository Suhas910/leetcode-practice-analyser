package com.leetcodeanalyser.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {
    @Value("${gemini.api.key}")
    private String apiKey;

    // Stable v1 endpoint for 2026 models
    private final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=";

    /**
     * Original method: AI advice using pattern counts only (for username-only
     * flow).
     */
    public String getAiAdvice(String userMessage, Map<String, Integer> patterns) {
        String systemPrompt = "CONTEXT: You are a Lead Pattern Architect and Senior Interview Coach. " +
                "You are mentoring a CS student who wants to crack MAANG interviews. " +
                "The student's current LeetCode solve counts are: " + patterns.toString() + ".\n\n" +

                "YOUR MISSION:\n" +
                "1. LOGICAL GAP ANALYSIS: Identify 'Blind Spots'. For example, if they have high solves in Arrays but 0 in Sliding Window, explain that they are missing the 'Two-Pointer' optimization mindset.\n"
                +
                "2. THE BRIDGE: Recommend specific problems that connect two topics.\n" +
                "3. SPECIFIC ORDERING: Suggest a sequence of 3 problems to master a pattern they are currently weak in.\n\n"
                +

                "CONSTRAINTS:\n" +
                "- Be firm but insightful. Speak like a Principal Engineer.\n" +
                "- Use Markdown: Use **bolding** for patterns and [LeetCode Links](url) for problems.\n" +
                "- Mention prerequisites (e.g., 'Don't touch DP until your Recursion count is above 15').\n" +
                "- Keep the total response under 200 words.";

        return callGemini(systemPrompt, userMessage);
    }

    /**
     * Enhanced method: AI advice using full categorized problem list (for
     * list-based flow).
     */
    public String getAiAdviceWithProblems(String userMessage, String categorizedSummary) {
        String systemPrompt = "CONTEXT: You are a Lead Pattern Architect and Senior Interview Coach. " +
                "You are mentoring a CS student who wants to crack MAANG interviews.\n\n" +

                "The student has solved the following problems, categorized by pattern:\n\n" +
                categorizedSummary + "\n\n" +

                "YOUR MISSION:\n" +
                "1. DEEP GAP ANALYSIS: You can see EVERY problem they've solved. Identify specific blind spots — " +
                "patterns they've never touched, difficulty levels they're avoiding, and sub-topics they're missing.\n"
                +
                "2. SMART RECOMMENDATIONS: Suggest specific LeetCode problems they HAVEN'T solved that would " +
                "fill their gaps. Include problem links in format [Problem Name](https://leetcode.com/problems/slug/).\n"
                +
                "3. PROGRESSION PATH: Based on their current level in each pattern, suggest what to tackle next " +
                "(e.g., 'You've done 5 Easy DP problems — time for Medium: try House Robber II').\n" +
                "4. CROSS-PATTERN BRIDGES: Recommend problems that connect weak and strong areas " +
                "(e.g., 'Merge Intervals bridges Sorting + Greedy').\n\n" +

                "CONSTRAINTS:\n" +
                "- Be specific — reference actual problems from their solved list.\n" +
                "- Use Markdown formatting with **bold** patterns and [linked problems](url).\n" +
                "- Speak like a Principal Engineer giving a career-defining code review.\n" +
                "- Keep the response focused and under 300 words.";

        return callGemini(systemPrompt, userMessage);
    }

    /**
     * Generates a structured 4-week study plan based on the user's solved problems.
     */
    public String generateStudyPlan(String categorizedSummary) {
        String systemPrompt = "CONTEXT: You are a Lead Pattern Architect and Senior Interview Coach. " +
                "You are building a personalized 4-week study plan for a CS student targeting MAANG interviews.\n\n" +

                "The student has solved the following problems:\n\n" +
                categorizedSummary + "\n\n" +

                "YOUR MISSION: Create a structured 4-WEEK STUDY PLAN.\n\n" +

                "FORMAT (use this EXACT structure):\n" +
                "### 📅 Week 1: [Theme — target the weakest pattern]\n" +
                "**Focus:** [Pattern name]\n" +
                "**Why:** [1-line reason based on their data]\n" +
                "| Day | Problem | Difficulty | Link |\n" +
                "|-----|---------|-----------|------|\n" +
                "| Mon | Problem Name | Medium | [Link](url) |\n" +
                "(5 problems per week, Mon-Fri)\n\n" +

                "Repeat for Week 2, 3, 4. Each week should target a DIFFERENT weak pattern.\n\n" +

                "CONSTRAINTS:\n" +
                "- ONLY recommend problems they HAVEN'T solved.\n" +
                "- Progress from Easy → Medium → Hard within each week.\n" +
                "- Week 1 = weakest pattern, Week 4 = reinforcement/mixed.\n" +
                "- Include LeetCode links in format [Name](https://leetcode.com/problems/slug/).\n" +
                "- End with a 1-line motivational closer.";

        return callGemini(systemPrompt, "Generate my personalized 4-week study plan.");
    }

    /**
     * Common Gemini API call logic.
     */
    private String callGemini(String systemPrompt, String userMessage) {
        RestTemplate restTemplate = new RestTemplate();

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", systemPrompt + "\n\nUser Question: " + userMessage)))));

        try {
            Map<String, Object> response = restTemplate.postForObject(GEMINI_URL + apiKey, requestBody, Map.class);

            if (response == null || !response.containsKey("candidates")) {
                return "Mentor is pondering... (No response from API).";
            }

            List candidates = (List) response.get("candidates");
            Map firstCandidate = (Map) candidates.get(0);
            Map content = (Map) firstCandidate.get("content");
            List parts = (List) content.get("parts");
            Map firstPart = (Map) parts.get(0);

            return (String) firstPart.get("text");

        } catch (Exception e) {
            return "Mentor is offline. Check backend logs or API quota. Error: " + e.getMessage();
        }
    }
}