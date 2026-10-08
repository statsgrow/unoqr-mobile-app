import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { colors, fontFamilies, fontSizes, spacing } from "@/theme/tokens";

/* ------------------ BREAK ------------------ */

type PageHeaderProps = {
  title: string;
  description?: string;
  rightAction?: ReactNode;
};

/* ------------------ BREAK ------------------ */

// Renders a consistent page title with an optional supporting description.
export function PageHeader({ title, description, rightAction }: PageHeaderProps) {
  //Default Return
  return (
    <View style={styles.root}>
      {rightAction ? <View style={styles.titleRow}><Text style={[styles.title, styles.titleCopy]}>{title}</Text>{rightAction}</View>
        : <Text style={styles.title}>{title}</Text>}
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );//return ends
};//export ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
  root: {
    minWidth: 0,
    gap: spacing.xxs
  },
  title: {
    color: colors.primary.main,
    fontFamily: fontFamilies.primaryBold,
    fontSize: fontSizes.h4
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  titleCopy: { flex: 1 },
  description: {
    color: colors.mute.main,
    fontFamily: fontFamilies.primaryRegular,
    fontSize: fontSizes.body2
  }
});
