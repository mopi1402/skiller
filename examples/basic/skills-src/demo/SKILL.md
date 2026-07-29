---
name: demo
description: Demonstrates what skiller strips from a skill and what it leaves alone.
---

<!--
Author note: this file is the SOURCE. Notes written in a comment like this one never
reach the compiled skill, so they cost the model nothing to read.
-->

## Steps

1. Read the config <!-- the .skiller.json sitting next to this folder --> before anything else.
2. Leave the fence below untouched:

```md
<!-- this comment is content, not a note: it must survive compilation -->
```

3. Ship. <!-- and only then -->
