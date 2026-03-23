package com.leetcodeanalyser.model;

import java.util.List;

public class SolvedProblem {

    private String title;
    private String titleSlug;
    private String difficulty;
    private List<String> topicTags;
    private String pattern; // primary pattern (first match, for display)
    private List<String> patterns; // ALL matching patterns (for multi-tag counting)

    public SolvedProblem(String title, String titleSlug, String difficulty,
            List<String> topicTags, String pattern, List<String> patterns) {
        this.title = title;
        this.titleSlug = titleSlug;
        this.difficulty = difficulty;
        this.topicTags = topicTags;
        this.pattern = pattern;
        this.patterns = patterns;
    }

    public String getTitle() {
        return title;
    }

    public String getTitleSlug() {
        return titleSlug;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public List<String> getTopicTags() {
        return topicTags;
    }

    public String getPattern() {
        return pattern;
    }

    public List<String> getPatterns() {
        return patterns;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setTitleSlug(String titleSlug) {
        this.titleSlug = titleSlug;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public void setTopicTags(List<String> topicTags) {
        this.topicTags = topicTags;
    }

    public void setPattern(String pattern) {
        this.pattern = pattern;
    }

    public void setPatterns(List<String> patterns) {
        this.patterns = patterns;
    }
}
