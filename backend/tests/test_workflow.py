"""Unit tests for workflow router functions."""
import pytest
from backend.routers.workflow import _derive_tags, _build_follow_up_tasks


class TestDeriveTags:
    def test_empty_input_returns_base_tag(self):
        tags = _derive_tags("", "", "")
        assert tags == [{"tag": "已面访", "value": "true"}]

    def test_loan_keywords_in_needs(self):
        for kw in ["贷款", "借款", "融资", "额度"]:
            tags = _derive_tags(f"客户需要{kw}", "", "")
            assert {"tag": "贷款意向", "value": "有"} in tags

    def test_loan_keywords_in_commitments(self):
        tags = _derive_tags("", "客户承诺下周办理贷款", "")
        assert {"tag": "贷款意向", "value": "有"} in tags

    def test_deposit_keywords(self):
        tags = _derive_tags("客户想存大额定期", "", "")
        assert {"tag": "存款意向", "value": "高"} in tags

    def test_fund_keywords(self):
        tags = _derive_tags("", "客户对基金感兴趣", "")
        assert {"tag": "理财意向", "value": "有"} in tags

    def test_objections_present(self):
        tags = _derive_tags("", "", "觉得利率偏低")
        assert {"tag": "异议待解", "value": "true"} in tags

    def test_objections_empty(self):
        tags = _derive_tags("", "", "")
        assert not any(t["tag"] == "异议待解" for t in tags)

    def test_multiple_tags_combined(self):
        tags = _derive_tags("需要贷款和基金", "", "有些顾虑")
        tag_names = [t["tag"] for t in tags]
        assert "贷款意向" in tag_names
        assert "理财意向" in tag_names
        assert "异议待解" in tag_names

    def test_always_includes_base_tag(self):
        tags = _derive_tags("贷款存款基金", "承诺", "异议")
        assert tags[0] == {"tag": "已面访", "value": "true"}


class TestBuildFollowUpTasks:
    def test_loan_keywords_generate_high_priority(self):
        tasks = _build_follow_up_tasks("需要贷款", "")
        assert any(t["priority"] == "high" for t in tasks)
        assert any("贷款" in t["task"] for t in tasks)

    def test_non_loan_generates_medium_priority(self):
        tasks = _build_follow_up_tasks("客户想了解理财", "")
        assert any("产品介绍" in t["task"] for t in tasks)

    def test_always_includes_follow_up(self):
        tasks = _build_follow_up_tasks("", "")
        assert any(t["priority"] == "low" for t in tasks)

    def test_finance_keyword_in_commitments(self):
        tasks = _build_follow_up_tasks("", "承诺下周办理融资")
        assert any(t["priority"] == "high" for t in tasks)
