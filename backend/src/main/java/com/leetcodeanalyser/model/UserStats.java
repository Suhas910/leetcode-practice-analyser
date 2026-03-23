package com.leetcodeanalyser.model;

public class UserStats {

    private int totalSolved;
    private int easy;
    private int medium;
    private int hard;

    public UserStats(int totalSolved, int easy, int medium, int hard) {
        this.totalSolved = totalSolved;
        this.easy = easy;
        this.medium = medium;
        this.hard = hard;
    }

    public int getTotalSolved() {
        return totalSolved;
    }

    public int getEasy() {
        return easy;
    }

    public int getMedium() {
        return medium;
    }

    public int getHard() {
        return hard;
    }
}
